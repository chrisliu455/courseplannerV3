/**
 * engine/ruleset.js — 規則集工具
 *
 * 這一層不認識 DOM，也不認識任何特定學系。
 * 它負責：把規則集（ruleset）整理成引擎好查的索引、套用使用者的標籤編輯、檢查規則集本身有沒有寫錯。
 *
 * 名詞：
 *   tag（標籤）    一門課只會有一個標籤，例如「物理領域」。
 *   bucket（項目） 學分判定的最小單位，可以吃 1 個以上的標籤，例如「通識」吃核心通識＋一般通識。
 *   category（大類）五大類：校定必修／系定必修／專業學程／其他選修／其他身分。
 */

/** 課名比對用：去掉空白與大小寫差異，全形數字不動（中文課名少用）。 */
export function normalizeName(s) {
  return String(s ?? '').replace(/\s+/g, '').toLowerCase();
}

/** 一門課是否納入判定：排進學期就算數。 */
export function isCounted(course) {
  return Boolean(course && course.semester);
}

export function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 條件式啟用。規則集裡任何節點都可以寫 when，用來對應學生選的選項。
 *   when: { option:'track', equals:'control' }
 *   when: { option:'minor', in:['qf','stat'] }
 *   when: { option:'minor', truthy:true }
 */
export function isActive(node, options = {}) {
  const w = node && node.when;
  if (!w) return true;
  const v = options[w.option];
  if ('equals' in w) return v === w.equals;
  if ('in' in w) return Array.isArray(w.in) && w.in.includes(v);
  if ('truthy' in w) return Boolean(v) === Boolean(w.truthy);
  return true;
}

/**
 * 套用使用者對標籤的編輯，產生一份新的規則集（不動原始規則集）。
 *
 * edits = {
 *   tags:   { 'tag.physics': { label:'物理領域', color:'#9E4B45' } },   // 改名 / 改色
 *   moves:  { 'tag.physics': 'bucket.elective' },                       // 把標籤搬到別的項目
 *   custom: [ { id:'tag.xxx', label:'自訂', color:'#333', bucket:'bucket.elective' } ]
 * }
 */
export function applyTagEdits(ruleset, edits = {}) {
  const { tags: labelEdits = {}, moves = {}, custom = [] } = edits;

  const tags = ruleset.tags.map((t) => ({ ...t, ...(labelEdits[t.id] || {}) }));
  custom.forEach((c) => {
    if (!tags.some((t) => t.id === c.id)) tags.push({ id: c.id, label: c.label, color: c.color });
  });

  // 先算出每個標籤最終該落在哪個項目
  const target = new Map();
  ruleset.categories.forEach((cat) =>
    cat.buckets.forEach((b) => (b.tags || []).forEach((tid) => target.set(tid, b.id)))
  );
  custom.forEach((c) => c.bucket && target.set(c.id, c.bucket));
  Object.entries(moves).forEach(([tid, bid]) => target.set(tid, bid));

  const categories = ruleset.categories.map((cat) => ({
    ...cat,
    buckets: cat.buckets.map((b) => ({
      ...b,
      tags: tags.filter((t) => target.get(t.id) === b.id).map((t) => t.id),
    })),
  }));

  return { ...ruleset, tags, categories };
}

/** 建立查表索引。bucket id 在整份規則集中必須唯一（溢出設定要靠它定位）。 */
export function buildIndex(ruleset, options = {}) {
  const tagById = new Map(ruleset.tags.map((t) => [t.id, t]));
  const bucketById = new Map();
  const bucketOfTag = new Map();
  const bucketOrder = [];

  ruleset.categories.forEach((cat) => {
    const catActive = isActive(cat, options);
    cat.buckets.forEach((b) => {
      const entry = {
        ...b,
        categoryId: cat.id,
        categoryLabel: cat.label,
        active: catActive && isActive(b, options),
      };
      bucketById.set(b.id, entry);
      bucketOrder.push(b.id);
      (b.tags || []).forEach((tid) => bucketOfTag.set(tid, b.id));
    });
  });

  return { tagById, bucketById, bucketOfTag, bucketOrder };
}

/** 規則集健檢。回傳問題清單，空陣列代表沒問題。UI 會把這些顯示出來。 */
export function validateRuleset(ruleset) {
  const issues = [];
  const push = (level, message) => issues.push({ level, message });

  if (!ruleset || !Array.isArray(ruleset.tags)) {
    push('error', '規則集缺少 tags 陣列');
    return issues;
  }

  const seenTag = new Set();
  ruleset.tags.forEach((t) => {
    if (seenTag.has(t.id)) push('error', `標籤 id 重複：${t.id}`);
    seenTag.add(t.id);
  });

  const seenBucket = new Set();
  const mapped = new Map();
  ruleset.categories.forEach((cat) => {
    (cat.buckets || []).forEach((b) => {
      if (seenBucket.has(b.id)) push('error', `項目 id 重複：${b.id}`);
      seenBucket.add(b.id);
      (b.tags || []).forEach((tid) => {
        if (!seenTag.has(tid)) push('error', `項目「${b.label}」引用了不存在的標籤：${tid}`);
        if (mapped.has(tid)) {
          push('error', `標籤「${tid}」同時屬於「${mapped.get(tid)}」與「${b.label}」，一個標籤只能歸一個項目`);
        }
        mapped.set(tid, b.label);
      });
    });
  });

  ruleset.tags.forEach((t) => {
    if (!mapped.has(t.id)) push('warn', `標籤「${t.label}」沒有歸到任何項目，掛此標籤的課不會被計入學分`);
  });

  ruleset.categories.forEach((cat) =>
    (cat.buckets || []).forEach((b) => {
      if (b.overflowTo && !seenBucket.has(b.overflowTo)) {
        push('error', `項目「${b.label}」的溢出目標不存在：${b.overflowTo}`);
      }
      if (b.cap != null && b.minCredits != null && b.cap < b.minCredits) {
        push('warn', `項目「${b.label}」的上限（${b.cap}）低於應修學分（${b.minCredits}），永遠無法達標`);
      }
    })
  );

  // 新增科系時最容易算錯的地方：各大類加起來要等於畢業總學分
  if (ruleset.totalCredits != null) {
    const sum = ruleset.categories
      .filter((cat) => cat.countsTowardTotal !== false)
      .reduce((s, cat) => {
        if (cat.minCredits != null) return s + Number(cat.minCredits);
        return s + (cat.buckets || []).reduce((x, b) => x + (Number(b.minCredits) || 0), 0);
      }, 0);
    if (sum !== Number(ruleset.totalCredits)) {
      push(
        'warn',
        `各大類應修學分加總為 ${sum}，與畢業總學分 ${ruleset.totalCredits} 不符。` +
          `修滿每一類仍可能達不到（或超過）畢業門檻，請檢查數字。`
      );
    }
  }

  // 大類自己的 minCredits 也要跟底下項目對得起來
  ruleset.categories.forEach((cat) => {
    if (cat.minCredits == null) return;
    const inner = (cat.buckets || []).reduce((s, b) => s + (Number(b.minCredits) || 0), 0);
    if (inner > Number(cat.minCredits)) {
      push('warn', `「${cat.label}」底下各項目加總 ${inner}，超過該大類的應修學分 ${cat.minCredits}`);
    }
  });

  return issues;
}
