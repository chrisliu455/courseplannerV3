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
 * 預設關閉：每次開啟網站都是空白的，關掉分頁資料就不見。
 * 畫面右上角有「自動保存」開關可以隨時打開，不用改程式碼。
 * 開關本身的狀態會記住；關閉時會把存的規劃一併刪除。
 */

import { DEFAULT_MAJOR_ID, getModule } from '../rulesets/index.js';
import { mergeModules, customModule } from '../engine/index.js';

const STORAGE_KEY = 'credit-planner/plan/v2';
const LEGACY_KEYS = ['credit-planner/plan/v1'];
const PERSIST_KEY = 'credit-planner/persist';
const PLAN_VERSION = 2;

/** 預設不保存。使用者可以在畫面上打開。 */
let persist = readPersistFlag();

function readPersistFlag() {
  try {
    return localStorage.getItem(PERSIST_KEY) === 'on';
  } catch {
    return false; // 無痕模式讀不到 localStorage，一律當作不保存
  }
}

function clearStored() {
  try {
    [STORAGE_KEY, ...LEGACY_KEYS].forEach((k) => localStorage.removeItem(k));
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
    clearStored();
    return emptyPlan();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEYS[0]);
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
    courses: (data.courses || []).map((c) => ({ ...c, credit: Number(c.credit) || 0 })),
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
      /* 無痕模式：這次切換有效，下次開站會回到預設 */
    }
    if (persist) save();
    else clearStored();
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
    };
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
    }));
    plan.courses.push(...added);
    commit();
    return added;
  },
  updateCourse(id, patch) {
    const c = plan.courses.find((x) => x.id === id);
    if (!c) return;
    Object.assign(c, patch);
    commit();
  },
  removeCourse(id) {
    plan.courses = plan.courses.filter((c) => c.id !== id);
    commit();
  },
  assign(id, semester) {
    const c = plan.courses.find((x) => x.id === id);
    if (!c || c.semester === semester) return;
    c.semester = semester;
    commit();
  },
  hasCourse(name) {
    const key = String(name).replace(/\s+/g, '').toLowerCase();
    return plan.courses.some((c) => c.name.replace(/\s+/g, '').toLowerCase() === key);
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
