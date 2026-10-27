/**
 * engine/schedule.js — 學期對照、選班與衝堂判定
 *
 * 跟引擎其他部分一樣是純函式：不碰 DOM、不碰 localStorage，開課資料由呼叫端傳進來
 * （UI 傳 offerings/index.js 的 OFFERINGS，測試可以傳自己造的假資料）。
 *
 * ── 名詞 ─────────────────────────────────────
 *   規劃學期   y1s1 … y4s2（大一上 … 大四下），畫面上的格子
 *   學年度學期 '115-1'、'114-2'，開課資料用的學期
 *   班         開課資料裡的一門課，用科號辨識（例 'ECON100101'）
 *   節次       'M3' ＝ 週一第 3 節；兩門課有相同的節次就是衝堂
 */

import { normalizeName } from './ruleset.js';

/** 一週的星期代碼與一天的節次代碼，照課表上的順序排 */
export const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
export const PERIODS = ['1', '2', '3', '4', 'n', '5', '6', '7', '8', '9', 'a', 'b', 'c'];

/** 課名比對：空白、大小寫、全形／半形都不計（「微積分Ａ一」＝「微積分A一」） */
const nameKey = (s) => normalizeName(String(s ?? '').normalize('NFKC'));

/**
 * 規劃學期 → 學年度學期。
 *   termOf('y2s1', 114) → { year: 115, term: 1, key: '115-1' }
 * 認不得的學期 id 或沒有入學年時回傳 null。
 */
export function termOf(semId, admissionYear) {
  const m = /^y(\d)s([12])$/.exec(semId || '');
  if (!m || !Number.isFinite(Number(admissionYear))) return null;
  const year = Number(admissionYear) + Number(m[1]) - 1;
  const term = Number(m[2]);
  return { year, term, key: `${year}-${term}` };
}

/** '115-1' → { year: 115, term: 1 } */
function parseTerm(key) {
  const m = /^(\d+)-([12])$/.exec(key || '');
  return m ? { year: Number(m[1]), term: Number(m[2]) } : null;
}

/**
 * 這個學年度學期要用哪些開課資料。每個系所各挑一份：
 *   有當學期的資料 → 用它（reference: false）
 *   沒有 → 用年份最接近的「同一學期」（上學期找上學期、下學期找下學期），
 *          一樣近時取較新的那年（reference: true）
 * 上下學期開的課不同，所以絕不拿下學期的資料去補上學期。
 */
export function sourcesFor(offerings, termKey) {
  const want = parseTerm(termKey);
  if (!want) return [];

  const best = new Map(); // dept → offering
  for (const o of offerings || []) {
    if (o.term !== want.term) continue;
    const cur = best.get(o.dept);
    if (!cur || isCloser(o.year, cur.year, want.year)) best.set(o.dept, o);
  }
  return [...best.values()].map((offering) => ({ offering, reference: offering.year !== want.year }));
}

/** a 是否比 b 更接近目標年；一樣近時取較新的 */
function isCloser(a, b, target) {
  const da = Math.abs(a - target);
  const db = Math.abs(b - target);
  return da < db || (da === db && a > b);
}

/** 把開課資料裡的一門課，包成帶出處的「班」 */
function toSection(course, offering, reference) {
  return {
    ...course,
    dept: offering.dept,
    sourceTerm: offering.semester,
    reference,
  };
}

/**
 * 在這個學期的開課資料裡找某個科號。找不到回傳 null。
 * 同一科號理論上只出現一次；萬一同科號有兩種時段（抽取時會警告），取第一筆。
 */
export function findSection(offerings, termKey, no) {
  if (!no) return null;
  for (const { offering, reference } of sourcesFor(offerings, termKey)) {
    const hit = offering.courses.find((c) => c.no === no);
    if (hit) return toSection(hit, offering, reference);
  }
  return null;
}

/**
 * 選班的候選清單。
 *   { name }    課名相同的各班（全形／半形、空白不計）
 *   { keyword } 課名或科號含有關鍵字的各班，給課名對不上時手動找
 * 佔位課（科號 YZ 開頭，只是提醒「去別系選」）不是真正的班，不列入。
 * 同一科號出現在兩個系所的資料裡時只留一筆。依科號排序。
 */
export function sectionCandidates(offerings, termKey, { name, keyword } = {}) {
  const byName = name ? nameKey(name) : null;
  const byWord = keyword ? nameKey(keyword) : null;
  if (!byName && !byWord) return [];

  const seen = new Map();
  for (const { offering, reference } of sourcesFor(offerings, termKey)) {
    for (const c of offering.courses) {
      if (c.placeholder || seen.has(c.no)) continue;
      const ok = byWord
        ? nameKey(c.name).includes(byWord) || nameKey(c.no).includes(byWord)
        : nameKey(c.name) === byName;
      if (ok) seen.set(c.no, toSection(c, offering, reference));
    }
  }
  return [...seen.values()].sort((a, b) => a.no.localeCompare(b.no));
}

/**
 * 新增課程時的課名建議：在所有學期、所有系所的開課資料裡找課名或科號含有關鍵字的課。
 *   searchOfferings(OFFERINGS, '熱力') →
 *     [{ name: '熱力學', credit: 3, depts: ['動機系'], terms: ['114-2', '115-1'], sections: 4 }]
 * 跟選班不同，這裡還不知道要排哪個學期，所以不分學期；同課名同學分只列一筆，
 * 開在哪些系所、哪些學期、共幾個班一併列出。佔位課不列入。
 * 課名以關鍵字開頭的排前面，其餘依課名排序；最多回傳 limit 筆。
 */
export function searchOfferings(offerings, keyword, { limit = 8 } = {}) {
  const word = nameKey(keyword);
  if (!word) return [];

  const found = new Map(); // '課名|學分' → 結果
  for (const o of offerings || []) {
    for (const c of o.courses) {
      if (c.placeholder) continue;
      const key = nameKey(c.name);
      if (!key.includes(word) && !nameKey(c.no).includes(word)) continue;
      const id = `${key}|${c.credit}`;
      if (!found.has(id)) {
        found.set(id, { name: c.name, credit: c.credit, depts: [], terms: [], sections: new Set(), starts: key.startsWith(word) });
      }
      const hit = found.get(id);
      if (!hit.depts.includes(o.deptName)) hit.depts.push(o.deptName);
      if (!hit.terms.includes(o.semester)) hit.terms.push(o.semester);
      hit.sections.add(`${o.semester}|${c.no}`);
    }
  }

  return [...found.values()]
    .sort((a, b) => b.starts - a.starts || a.name.localeCompare(b.name, 'zh-Hant'))
    .slice(0, limit)
    .map(({ starts, sections, terms, ...rest }) => ({ ...rest, terms: terms.sort(), sections: sections.size }));
}

/** 一個班佔用的所有節次，例 ['M3', 'M4', 'W1', 'W2'] */
export function slotsOf(section) {
  return section ? section.meetings.flatMap((m) => m.slots) : [];
}

/**
 * 衝堂判定。
 *   items：[{ id, slots: ['M3', 'M4'] }, …]，通常是同一個學期裡已選班的課
 * 回傳：
 *   bySlot  { M3: ['c1', 'c2'] }       只列出有兩門以上的節次
 *   pairs   [{ a: 'c1', b: 'c2', slots: ['M3', 'M4'] }]   兩兩衝堂的組合與重疊的節次
 *   ids     ['c1', 'c2']               有衝堂的課
 * 同一門課自己的節次重複（例 'M3' 寫了兩次）不算衝堂。
 */
export function findConflicts(items) {
  const occupants = new Map(); // slot → [id]
  for (const { id, slots } of items || []) {
    for (const s of new Set(slots || [])) {
      if (!occupants.has(s)) occupants.set(s, []);
      occupants.get(s).push(id);
    }
  }

  const bySlot = {};
  const pairMap = new Map(); // 'a|b' → { a, b, slots }
  for (const [slot, ids] of occupants) {
    if (ids.length < 2) continue;
    bySlot[slot] = ids;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const k = `${ids[i]}|${ids[j]}`;
        if (!pairMap.has(k)) pairMap.set(k, { a: ids[i], b: ids[j], slots: [] });
        pairMap.get(k).slots.push(slot);
      }
    }
  }

  const pairs = [...pairMap.values()].map((p) => ({ ...p, slots: sortSlots(p.slots) }));
  const ids = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
  return { bySlot, pairs, ids };
}

/** 節次照「星期 → 節次」的課表順序排，例 ['W1', 'M4', 'M3'] → ['M3', 'M4', 'W1'] */
export function sortSlots(slots) {
  const rank = (s) => DAYS.indexOf(s[0]) * PERIODS.length + PERIODS.indexOf(s.slice(1));
  return [...slots].sort((a, b) => rank(a) - rank(b));
}

/**
 * 自訂時段：開課資料裡沒有的課，使用者自己點選上課節次。
 *   cleanSlots(['W2', 'M3', 'M3', 'X9']) → ['M3', 'W2']
 * 只留認得的節次（星期 DAYS × 節次 PERIODS），去掉重複，照課表順序排。
 */
export function cleanSlots(slots) {
  const valid = (s) => typeof s === 'string' && DAYS.includes(s[0]) && PERIODS.includes(s.slice(1));
  return sortSlots([...new Set((slots || []).filter(valid))]);
}

/**
 * 把自訂時段包成跟開課資料一樣形狀的「班」，週課表、衝堂判定就能照常使用。
 *   customSection(['M3', 'M4']) → { no: null, custom: true, meetings: [{ slots: ['M3', 'M4'], room: '' }], … }
 * 沒有任何有效節次時回傳 null（＝沒有自訂時段）。
 */
export function customSection(slots) {
  const clean = cleanSlots(slots);
  if (!clean.length) return null;
  return {
    no: null,
    name: '',
    custom: true,
    time: clean.join(''),
    meetings: [{ slots: clean, room: '' }],
    teachers: [],
    reference: false,
  };
}

/**
 * 這門課是不是排到了「開課資料裡沒開過」的學期（上學期／下學期）。
 *   termHint(offerings, '微積分Ａ二', '116-1') → { term: 2, terms: ['115-2'] }   只在下學期出現過
 *   termHint(offerings, '微積分Ａ二', '116-2') → null                            同一種學期有開
 *   termHint(offerings, '自己新增的課', '116-1') → null                          開課資料裡找不到，無從判斷
 * 只比上學期或下學期、不比年份；課名比對同選班（全形／半形、空白、大小寫不計），佔位課不算。
 * 回傳的 term 是「有出現過的那一種學期」，terms 是出現過的學年度學期。
 */
export function termHint(offerings, name, termKey) {
  const want = parseTerm(termKey);
  const key = nameKey(name);
  if (!want || !key) return null;

  const seen = new Set();
  for (const o of offerings || []) {
    if (o.courses.some((c) => !c.placeholder && nameKey(c.name) === key)) seen.add(o.semester);
  }
  if (!seen.size) return null;
  const terms = [...seen].sort();
  if (terms.some((t) => parseTerm(t)?.term === want.term)) return null;
  return { term: parseTerm(terms[0]).term, terms };
}
