import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  termOf,
  sourcesFor,
  findSection,
  sectionCandidates,
  slotsOf,
  findConflicts,
  sortSlots,
} from '../engine/index.js';
import { OFFERINGS } from '../offerings/index.js';

/* ── 假資料：只放測試需要的欄位 ─────────────────── */
const course = (no, name, time, slots, extra = {}) => ({
  no,
  name,
  time,
  meetings: [{ slots, room: null, capacity: null }],
  placeholder: false,
  ...extra,
});
const offering = (dept, year, term, courses) => ({
  dept,
  year,
  term,
  semester: `${year}-${term}`,
  courses,
});

const FAKE = [
  offering('AAA', 114, 1, [course('AAA 100100', '舊課', 'M1', ['M1'])]),
  offering('AAA', 115, 1, [
    course('AAA 101001', '微積分Ａ一', 'M3M4', ['M3', 'M4']),
    course('AAA 101002', '微積分Ａ一', 'T3T4', ['T3', 'T4']),
    course('YZ 999999', '微積分Ａ一(去別系選)', 'R1', ['R1'], { placeholder: true }),
  ]),
  offering('AAA', 115, 2, [course('AAA 102001', '微積分Ａ二', 'M3M4', ['M3', 'M4'])]),
  offering('BBB', 113, 1, [course('BBB 200100', '只有很舊的資料', 'F1', ['F1'])]),
];

/* ── 學期對照 ─────────────────────────────── */
test('規劃學期換算成學年度學期', () => {
  assert.deepEqual(termOf('y1s1', 114), { year: 114, term: 1, key: '114-1' });
  assert.deepEqual(termOf('y1s2', 114), { year: 114, term: 2, key: '114-2' });
  assert.deepEqual(termOf('y2s1', 114), { year: 115, term: 1, key: '115-1' });
  assert.deepEqual(termOf('y4s2', 114), { year: 117, term: 2, key: '117-2' });
});

test('認不得的學期或沒有入學年時回傳 null', () => {
  assert.equal(termOf(null, 114), null);
  assert.equal(termOf('pool', 114), null);
  assert.equal(termOf('y1s1', undefined), null);
});

/* ── 用哪份開課資料 ─────────────────────────── */
test('有當學期資料就用當學期，不標參考', () => {
  const [src] = sourcesFor(FAKE, '115-1').filter((s) => s.offering.dept === 'AAA');
  assert.equal(src.offering.semester, '115-1');
  assert.equal(src.reference, false);
});

test('沒有當學期資料時用最接近的同一學期，並標成參考', () => {
  const src = sourcesFor(FAKE, '116-1');
  const aaa = src.find((s) => s.offering.dept === 'AAA');
  const bbb = src.find((s) => s.offering.dept === 'BBB');
  assert.equal(aaa.offering.semester, '115-1'); // 115 比 114 更接近 116
  assert.equal(aaa.reference, true);
  assert.equal(bbb.offering.semester, '113-1'); // BBB 只有這份，再舊也照用
});

test('一樣近時取較新的那年', () => {
  // 目標 114-1，113-1 和 115-1 都差一年 → 取 115-1
  const data = [offering('CCC', 113, 1, []), offering('CCC', 115, 1, [])];
  assert.equal(sourcesFor(data, '114-1')[0].offering.semester, '115-1');
});

test('上學期絕不拿下學期的資料來補', () => {
  const src = sourcesFor([offering('AAA', 115, 2, [])], '116-1');
  assert.deepEqual(src, []);
});

/* ── 選班 ─────────────────────────────────── */
test('依科號找班，並帶出處', () => {
  const s = findSection(FAKE, '115-1', 'AAA 101002');
  assert.equal(s.name, '微積分Ａ一');
  assert.equal(s.sourceTerm, '115-1');
  assert.equal(s.reference, false);
  assert.deepEqual(slotsOf(s), ['T3', 'T4']);
});

test('參考學期也找得到科號，但標成參考', () => {
  const s = findSection(FAKE, '116-1', 'AAA 101001');
  assert.equal(s.sourceTerm, '115-1');
  assert.equal(s.reference, true);
});

test('該學期沒有這個科號就回傳 null', () => {
  assert.equal(findSection(FAKE, '115-2', 'AAA 101001'), null);
  assert.equal(findSection(FAKE, '115-1', ''), null);
});

test('候選班：同名的課，全形半形與空白不計，佔位課不列入', () => {
  const list = sectionCandidates(FAKE, '115-1', { name: '微積分 A一' });
  assert.deepEqual(
    list.map((s) => s.no),
    ['AAA 101001', 'AAA 101002']
  );
});

test('候選班：用關鍵字找課名或科號', () => {
  assert.deepEqual(
    sectionCandidates(FAKE, '115-1', { keyword: '101002' }).map((s) => s.no),
    ['AAA 101002']
  );
  assert.equal(sectionCandidates(FAKE, '115-1', { keyword: '微積分' }).length, 2);
  assert.deepEqual(sectionCandidates(FAKE, '115-1', {}), []);
});

/* ── 衝堂 ─────────────────────────────────── */
test('沒有重疊就沒有衝堂', () => {
  const r = findConflicts([
    { id: 'c1', slots: ['M3', 'M4'] },
    { id: 'c2', slots: ['T3', 'T4'] },
  ]);
  assert.deepEqual(r, { bySlot: {}, pairs: [], ids: [] });
});

test('兩門課重疊：列出重疊的節次', () => {
  const r = findConflicts([
    { id: 'c1', slots: ['M3', 'M4', 'W2'] },
    { id: 'c2', slots: ['W2', 'M4'] },
  ]);
  assert.deepEqual(r.pairs, [{ a: 'c1', b: 'c2', slots: ['M4', 'W2'] }]);
  assert.deepEqual(r.bySlot, { M4: ['c1', 'c2'], W2: ['c1', 'c2'] });
  assert.deepEqual(r.ids, ['c1', 'c2']);
});

test('三門課擠在同一節：兩兩都列出來', () => {
  const r = findConflicts([
    { id: 'a', slots: ['F5'] },
    { id: 'b', slots: ['F5'] },
    { id: 'c', slots: ['F5', 'F6'] },
  ]);
  assert.equal(r.pairs.length, 3);
  assert.deepEqual(r.bySlot.F5, ['a', 'b', 'c']);
});

test('同一門課自己的節次重複不算衝堂；沒有節次的課不影響', () => {
  const r = findConflicts([
    { id: 'c1', slots: ['M3', 'M3'] },
    { id: 'c2', slots: [] },
    { id: 'c3' },
  ]);
  assert.deepEqual(r.pairs, []);
});

test('節次照星期、再照節次排序（中午 n 在 4 和 5 之間，晚上 a b c 在最後）', () => {
  assert.deepEqual(sortSlots(['W1', 'M5', 'Mn', 'M4', 'Ma']), ['M4', 'Mn', 'M5', 'Ma', 'W1']);
});

/* ── 真實開課資料 ─────────────────────────────── */
test('真實資料：114 入學的大二上對到 115-1，動機系工程數學一清華兩班同時段', () => {
  const { key } = termOf('y2s1', 114);
  assert.equal(key, '115-1');
  const list = sectionCandidates(OFFERINGS, key, { name: '工程數學一' });
  assert.deepEqual(
    list.map((s) => [s.no, s.time]),
    [
      ['PME 200101', 'M3M4W2'],
      ['PME 200102', 'M3M4W2'],
    ]
  );
});

test('真實資料：計財系統計學一和動機系工程數學一（清班）在 115-1 衝堂', () => {
  const stat = findSection(OFFERINGS, '115-1', 'QF 214401'); // M3M4W2
  const em = findSection(OFFERINGS, '115-1', 'PME 200101'); // M3M4W2
  const r = findConflicts([
    { id: 'stat', slots: slotsOf(stat) },
    { id: 'em', slots: slotsOf(em) },
  ]);
  assert.deepEqual(r.pairs, [{ a: 'stat', b: 'em', slots: ['M3', 'M4', 'W2'] }]);
});

test('真實資料：還沒公布的 116-1 用 115-1 當參考', () => {
  const s = findSection(OFFERINGS, '116-1', 'PME 343300'); // 機械設計
  assert.equal(s.sourceTerm, '115-1');
  assert.equal(s.reference, true);
});
