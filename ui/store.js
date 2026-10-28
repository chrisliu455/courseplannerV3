/**
 * ui/store.js — 規劃資料的唯一真相來源
 *
 * 這一層管狀態，不管長相。任何改動都走這裡的方法，
 * 改完自動存 localStorage 並通知所有訂閱者重畫。
 *
 * plan.majorId ＋ plan.identityIds ＋ plan.customIdentities 決定要合併哪些身分模組，
 * store.ruleset 就是合併後的結果，畢業學分要求由這些身分相加而來。
 *
 * ── 自動保存 ────────────────────────────────
 * 預設關閉，每次開站都是空白的。畫面右上角可以打開。
 *
 * 打開後規劃會寫進 localStorage。localStorage 綁在「這個瀏覽器」上，
 * 不會上傳、不會跨裝置、不會被別人的瀏覽器讀到。
 * 唯一要注意的是共用電腦：同一台機器同一個瀏覽器設定檔，下一個人會看到。
 *
 * 開關狀態本身也記在 localStorage，所以打開過一次就會一直保持。
 */

import { DEFAULT_MAJOR_ID, getModule } from '../rulesets/index.js';
import { OFFERINGS } from '../offerings/index.js';
import { mergeModules, customModule, termOf, findSection, sectionCandidates, cleanSlots, customSection, termHint, parsePrereq, checkPrereq, prereqTextFor } from '../engine/index.js';

const STORAGE_KEY = 'credit-planner/plan/v2';
const LEGACY_PLAN_KEYS = ['credit-planner/plan/v1'];
const PERSIST_KEY = 'credit-planner/persist';

const PLAN_VERSION = 2;

/** 自動保存是否開啟。預設關閉，使用者可在畫面上打開。 */
let persist = readPersistFlag();

function readPersistFlag() {
  try {
    return localStorage.getItem(PERSIST_KEY) === 'on';
  } catch {
    return false; // 無痕模式讀不到 localStorage，一律當作關閉
  }
}

/** 清掉存下來的規劃（不動開關本身的設定） */
function clearStoredPlan() {
  try {
    [STORAGE_KEY, ...LEGACY_PLAN_KEYS].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 讀不到就算了 */
  }
}

function emptyPlan() {
  return {
    version: PLAN_VERSION,
    majorId: DEFAULT_MAJOR_ID,
    identityIds: [],        // 內建身分模組，例：['minor.qf']
    customIdentities: [],   // 自訂身分：{ id, type, label, credits }
    meta: { studentName: '' },
    options: {},
    courses: [],
    lockedSemesters: [],    // 已鎖定、不接受編輯的學期 id，例：['y1s1']
    tagEdits: { tags: {}, moves: {}, custom: [] },
  };
}

let plan = load();
let uid = plan.courses.reduce((m, c) => Math.max(m, Number(String(c.id).slice(1)) || 0), 0);
const listeners = new Set();

/* ── 讀寫 ────────────────────────────────── */
function load() {
  if (!persist) {
    // 沒開保存就順手清掉殘留資料，避免舊規劃陰魂不散
    clearStoredPlan();
    return emptyPlan();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_PLAN_KEYS[0]);
    if (!raw) return emptyPlan();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyPlan();
  }
}

/** 舊版規劃檔（v1 用 rulesetId ＋ options.minor）自動轉成 v2 的身分模組 */
function migrate(data) {
  const base = emptyPlan();
  const out = {
    ...base,
    ...data,
    version: PLAN_VERSION,
    meta: { ...base.meta, ...(data.meta || {}) },
    options: { ...(data.options || {}) },
    identityIds: [...(data.identityIds || [])],
    customIdentities: [...(data.customIdentities || [])],
    // 舊版規劃檔沒有 section（選的班）與 customSlots（自訂時段），讀進來就是都還沒設
    courses: (data.courses || []).map((c) => ({
      ...c,
      credit: Number(c.credit) || 0,
      section: c.section || null,
      customSlots: slotsOrNull(c.customSlots),
    })),
    // 舊版規劃檔沒有這個欄位，讀進來就是全部未鎖定
    lockedSemesters: [...(data.lockedSemesters || [])],
    tagEdits: { ...base.tagEdits, ...(data.tagEdits || {}) },
  };

  if (data.rulesetId && !data.majorId) {
    out.majorId = data.rulesetId === 'dongji-113' ? 'major.dongji-113' : data.rulesetId;
  }
  if (out.options.minor === 'qf' && !out.identityIds.includes('minor.qf')) {
    out.identityIds.push('minor.qf');
    out.courses.forEach((c) => {
      if (c.tag === 'tag.minor') c.tag = 'tag.minor-qf';
    });
  }
  delete out.options.minor;
  delete out.rulesetId;
  return out;
}

function save() {
  if (!persist) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    /* 無痕模式或空間滿了：畫面照常運作，只是這次沒存起來 */
  }
}

function commit() {
  save();
  listeners.forEach((fn) => fn(plan));
}

/** 這個學期是否已鎖定。semester 為 null（＝待排清單）時一律視為未鎖定 */
function isLocked(semester) {
  return Boolean(semester) && plan.lockedSemesters.includes(semester);
}

/** 規劃學期的先後順序：y1s1 → 3、y1s2 → 4、y2s1 → 5 …，數字越小越早 */
function semesterOrder(semester) {
  const m = /^y(\d)s([12])$/.exec(semester || '');
  return m ? Number(m[1]) * 2 + Number(m[2]) : Infinity;
}

/* ── 選班 ────────────────────────────────── */
/** 規劃學期（y2s1）對到哪個學年度學期（'115-1'），由主修的入學年推算 */
function termKeyOf(semester) {
  return termOf(semester, getModule(plan.majorId)?.admissionYear)?.key || null;
}

/** 整理自訂時段：沒有任何有效節次就存成 null */
function slotsOrNull(slots) {
  const clean = cleanSlots(slots);
  return clean.length ? clean : null;
}

/**
 * 這門課的上課時段來源：有自訂時段就用自訂時段（包成跟開課資料一樣形狀的班），
 * 否則看選的班在它目前的學期還找不找得到（找得到就回傳那一班）
 */
function resolveSection(course) {
  if (course.customSlots && course.semester) return customSection(course.customSlots);
  if (!course.section || !course.semester) return null;
  return findSection(OFFERINGS, termKeyOf(course.semester), course.section);
}

/** 換學期或換主修後，選的班在新學期不存在的就清掉，讓使用者重選 */
function dropUnavailableSection(course) {
  if (course.section && course.semester && !resolveSection(course)) course.section = null;
}

/**
 * 排進學期時，同名的課只開一班就直接幫忙選；兩班以上要使用者自己挑。
 * 只在「排進學期」這一刻做，使用者手動取消選班後不會被自動選回來。
 */
function autoPickSection(course) {
  if (course.section || !course.semester) return;
  const list = sectionCandidates(OFFERINGS, termKeyOf(course.semester), { name: course.name });
  if (list.length === 1) course.section = list[0].no;
}

/** 排進學期後的選班整理：先清掉新學期沒有的班，再看能不能自動選 */
function settleSection(course) {
  dropUnavailableSection(course);
  autoPickSection(course);
}

/** 目前生效的身分模組（主修排第一） */
function activeModules() {
  const mods = [getModule(plan.majorId)].filter(Boolean);
  plan.identityIds.forEach((id) => {
    const m = getModule(id);
    if (m) mods.push(m);
  });
  plan.customIdentities.forEach((ci) => mods.push(customModule(ci)));
  return mods;
}

/* ── 對外 ────────────────────────────────── */
export const store = {
  get plan() {
    return plan;
  },
  /** 合併所有身分模組後的規則集，引擎吃這個 */
  get ruleset() {
    return mergeModules(activeModules());
  },
  get modules() {
    return activeModules();
  },
  /* 自動保存開關 */
  get persistEnabled() {
    return persist;
  },
  setPersist(on) {
    persist = Boolean(on);
    try {
      localStorage.setItem(PERSIST_KEY, persist ? 'on' : 'off');
    } catch {
      /* 無痕模式：這次切換仍有效，下次開站會回到預設的關閉 */
    }
    if (persist) save();
    else clearStoredPlan(); // 關掉時把已存的規劃一併刪除，不留痕跡
    commit();
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /* 身分別 */
  setMajor(id) {
    if (id === plan.majorId) return;
    plan.majorId = id;
    plan.options = {};
    // 入學年不同，同一個「大二上」就對到不同學年度，選過的班可能不存在了
    plan.courses.forEach(settleSection);
    commit();
  },
  addIdentity(id) {
    if (plan.identityIds.includes(id)) return false;
    plan.identityIds.push(id);
    commit();
    return true;
  },
  addCustomIdentity({ type, label, credits }) {
    const id = 'custom.' + Date.now().toString(36);
    plan.customIdentities.push({ id, type, label, credits: Number(credits) || 0 });
    commit();
    return id;
  },
  /** 移除身分：回傳會被連帶清掉標籤的課程數，讓 UI 先問過使用者 */
  identityCourseCount(id) {
    const mod = getModule(id) || customModule(plan.customIdentities.find((c) => c.id === id) || {});
    const tagIds = (mod.tags || []).map((t) => t.id);
    return plan.courses.filter((c) => tagIds.includes(c.tag)).length;
  },
  removeIdentity(id) {
    const mod = getModule(id) || customModule(plan.customIdentities.find((c) => c.id === id) || {});
    const tagIds = (mod.tags || []).map((t) => t.id);
    plan.courses.forEach((c) => {
      if (tagIds.includes(c.tag)) c.tag = null;
    });
    plan.identityIds = plan.identityIds.filter((x) => x !== id);
    plan.customIdentities = plan.customIdentities.filter((x) => x.id !== id);
    commit();
  },

  setOption(key, value) {
    plan.options[key] = value;
    commit();
  },
  setMeta(key, value) {
    plan.meta[key] = value;
    commit();
  },

  /* 課程 */
  addCourse({ name, credit, tag, semester = null, note = '' }) {
    const course = {
      id: 'c' + ++uid,
      name: String(name).trim(),
      credit: Number(credit) || 0,
      tag: tag || null,
      semester,
      note,
      section: null,
      customSlots: null,
    };
    autoPickSection(course);
    plan.courses.push(course);
    commit();
    return course;
  },
  addCourses(list) {
    const added = list.map((c) => ({
      id: 'c' + ++uid,
      name: String(c.name).trim(),
      credit: Number(c.credit) || 0,
      tag: c.tag || null,
      semester: c.semester || null,
      note: c.note || '',
      section: c.section || null,
      customSlots: null,
    }));
    added.forEach(settleSection);
    plan.courses.push(...added);
    commit();
    return added;
  },
  updateCourse(id, patch) {
    const c = plan.courses.find((x) => x.id === id);
    if (!c || isLocked(c.semester)) return;
    Object.assign(c, patch);
    commit();
  },
  removeCourse(id) {
    const c = plan.courses.find((x) => x.id === id);
    if (!c || isLocked(c.semester)) return;
    plan.courses = plan.courses.filter((x) => x.id !== id);
    commit();
  },
  assign(id, semester) {
    const c = plan.courses.find((x) => x.id === id);
    if (!c || c.semester === semester) return false;
    // 最後一道防線：搬出去或搬進來，只要有一邊鎖住就不動
    if (isLocked(c.semester) || isLocked(semester)) return false;
    c.semester = semester;
    // 自訂時段是為原本那個學期設的，換學期（含拖回待排課程）就清掉
    c.customSlots = null;
    // 拖回待排課程時保留選班（還沒決定學期，沒得比）；換到別的學期才檢查、才自動選
    settleSection(c);
    commit();
    return true;
  },

  /* 選班：section 是開課資料裡的科號，null＝還沒選 */
  /** 規劃學期對到的學年度學期，例 'y2s1' → '115-1'；沒有入學年時回傳 null */
  termKeyOf,
  /** 這門課目前選的班（含時段、教室）；沒選或在這學期找不到時回傳 null */
  sectionOf: resolveSection,
  /**
   * 這門課是不是排到了開課資料裡沒開過的學期（例：只在上學期出現過，卻排在下學期）。
   * 回傳 { term, terms } 或 null。已選班、有自訂時段、還在待排課程裡的課不提醒。
   */
  termHintOf(course) {
    if (!course || !course.semester || course.section || course.customSlots) return null;
    return termHint(OFFERINGS, course.name, termKeyOf(course.semester));
  },
  /**
   * 擋修提醒：開課資料裡這門課有擋修條件，而先修課沒有排在「更早的學期」。
   * 回傳 { text, audience, unmet } 或 null（沒有擋修、條件都滿足、或還在待排課程裡）。
   *   text  擋修原文；unmet 沒滿足的那幾組條件（形狀見 engine 的 checkPrereq）
   * 成績無從得知，只看有沒有排。
   */
  prereqHintOf(course) {
    if (!course || !course.semester) return null;
    const text = prereqTextFor(OFFERINGS, { section: resolveSection(course), name: course.name });
    const parsed = parsePrereq(text);
    if (!parsed) return null;
    const mine = semesterOrder(course.semester);
    const earlier = plan.courses
      .filter((c) => c.semester && semesterOrder(c.semester) < mine)
      .map((c) => c.name);
    const unmet = checkPrereq(parsed, earlier);
    return unmet.length ? { text, audience: parsed.audience, unmet } : null;
  },
  /** 選班。只能選目前學期找得到的科號；傳 null 取消選班 */
  setSection(id, no) {
    const c = plan.courses.find((x) => x.id === id);
    if (!c || isLocked(c.semester)) return false;
    if (no && !findSection(OFFERINGS, termKeyOf(c.semester), no)) return false;
    c.section = no || null;
    if (no) c.customSlots = null; // 選了班就改用那一班的時段，自訂時段作廢
    commit();
    return true;
  },
  /**
   * 自訂時段：開課資料裡沒有的課，自己設定上課節次，例 ['M3', 'M4']。
   * 設了就取代選的班（兩者只能有一個）；傳空陣列或 null 清除。
   * 課要已經排進學期、而且學期沒鎖住才能設。
   */
  setCustomSlots(id, slots) {
    const c = plan.courses.find((x) => x.id === id);
    if (!c || !c.semester || isLocked(c.semester)) return false;
    c.customSlots = slotsOrNull(slots);
    if (c.customSlots) c.section = null;
    commit();
    return true;
  },
  hasCourse(name) {
    const key = String(name).replace(/\s+/g, '').toLowerCase();
    return plan.courses.some((c) => c.name.replace(/\s+/g, '').toLowerCase() === key);
  },

  /* 學期鎖定：鎖住的學期不接受搬入、搬出，裡面的課也不能改標籤或備註 */
  isSemesterLocked: isLocked,
  toggleSemesterLock(semester) {
    if (!semester) return false;
    const next = !isLocked(semester);
    plan.lockedSemesters = next
      ? [...plan.lockedSemesters, semester]
      : plan.lockedSemesters.filter((s) => s !== semester);
    commit();
    return next;
  },

  /* 標籤編輯 */
  editTag(tagId, patch) {
    plan.tagEdits.tags[tagId] = { ...(plan.tagEdits.tags[tagId] || {}), ...patch };
    commit();
  },
  moveTag(tagId, bucketId) {
    plan.tagEdits.moves[tagId] = bucketId;
    commit();
  },
  addCustomTag({ id, label, color, bucket }) {
    plan.tagEdits.custom.push({ id, label, color, bucket });
    commit();
  },
  removeCustomTag(tagId) {
    plan.tagEdits.custom = plan.tagEdits.custom.filter((t) => t.id !== tagId);
    plan.courses.forEach((c) => {
      if (c.tag === tagId) c.tag = null;
    });
    commit();
  },
  resetTagEdits() {
    plan.tagEdits = { tags: {}, moves: {}, custom: [] };
    commit();
  },

  /* 檔案 */
  exportPlan() {
    return JSON.stringify({ ...plan, exportedAt: new Date().toISOString() }, null, 2);
  },
  importPlan(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || !Array.isArray(data.courses)) throw new Error('這個檔案裡沒有課程資料');
    plan = migrate(data);
    uid = plan.courses.reduce((m, c) => Math.max(m, Number(String(c.id).slice(1)) || 0), 0);
    commit();
  },
  reset() {
    plan = emptyPlan();
    uid = 0;
    commit();
  },
};
