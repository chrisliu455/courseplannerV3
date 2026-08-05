/**
 * ui/store.js — 規劃資料的唯一真相來源
 *
 * 這一層管狀態，不管長相。任何改動都走這裡的方法，
 * 改完自動存 localStorage 並通知所有訂閱者重畫。
 */

import { DEFAULT_RULESET_ID, getRuleset } from '../rulesets/index.js';

const STORAGE_KEY = 'credit-planner/plan/v1';
const PLAN_VERSION = 1;

function emptyPlan() {
  return {
    version: PLAN_VERSION,
    rulesetId: DEFAULT_RULESET_ID,
    meta: { studentName: '', note: '' },
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPlan();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyPlan();
  }
}

function migrate(data) {
  const base = emptyPlan();
  return {
    ...base,
    ...data,
    version: PLAN_VERSION,
    meta: { ...base.meta, ...(data.meta || {}) },
    options: { ...(data.options || {}) },
    courses: (data.courses || []).map((c) => ({ ...c, credit: Number(c.credit) || 0 })),
    tagEdits: { ...base.tagEdits, ...(data.tagEdits || {}) },
  };
}

function save() {
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

/* ── 對外 ────────────────────────────────── */
export const store = {
  get plan() {
    return plan;
  },
  get ruleset() {
    return getRuleset(plan.rulesetId);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /* 修業設定 */
  setRuleset(id) {
    if (id === plan.rulesetId) return;
    plan.rulesetId = id;
    plan.options = {};
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
