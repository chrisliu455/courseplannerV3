/**
 * store 的選班規則（用真實開課資料，主修預設為動機系 114 入學：大二上＝115-1）
 *
 * store 在 Node 裡讀不到 localStorage，會當作「沒開自動保存」，每個測試前 reset() 即可。
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../ui/store.js';

beforeEach(() => store.reset());

const add = (name, semester = null) => store.addCourses([{ name, credit: 3, tag: null, semester }])[0];
const find = (id) => store.plan.courses.find((c) => c.id === id);

test('排進學期時，同名課只有一班就自動選', () => {
  const c = add('統計學一'); // 115-1 只有 QF 214401
  assert.equal(c.section, null); // 在待排課程裡：還沒有學期，不選
  store.assign(c.id, 'y2s1');
  assert.equal(find(c.id).section, 'QF 214401');
});

test('有兩班以上就不自動選，留給使用者挑', () => {
  const c = add('工程數學一', 'y2s1'); // 清班、華班兩班
  assert.equal(c.section, null);
  const la = add('線性代數', 'y2s1'); // 動機系、計財系各開一班
  assert.equal(la.section, null);
});

test('直接加在學期裡的課也會自動選', () => {
  const c = add('資訊工程導論', 'y2s1');
  assert.equal(c.section, 'QF 100201');
});

test('手動取消選班後不會被自動選回來，直到下次換學期', () => {
  const c = add('統計學一', 'y2s1');
  assert.equal(store.setSection(c.id, null), true);
  assert.equal(find(c.id).section, null);
  store.setOption('track', 'control'); // 任何其他改動都不該把班選回來
  assert.equal(find(c.id).section, null);
});

test('換到沒有這班的學期就清掉選班', () => {
  const c = add('統計學一', 'y2s1'); // QF 214401（115-1）
  store.assign(c.id, 'y2s2'); // 115-2 → 參考 114-2，統計學一沒開
  assert.equal(find(c.id).section, null);
});

test('換到參考學期仍有同一科號：保留原本選的班', () => {
  const c = add('工程數學一', 'y2s1');
  store.setSection(c.id, 'PME 200102');
  store.assign(c.id, 'y3s1'); // 116-1 沒資料 → 參考 115-1，同科號還在
  assert.equal(find(c.id).section, 'PME 200102');
  assert.equal(store.sectionOf(find(c.id)).reference, true);
});

test('拖回待排課程時保留選班', () => {
  const c = add('工程數學一', 'y2s1');
  store.setSection(c.id, 'PME 200101');
  store.assign(c.id, null);
  assert.equal(find(c.id).section, 'PME 200101');
});

test('不能選該學期沒有的科號；鎖住的學期不能改選班', () => {
  const c = add('工程數學一', 'y2s1');
  assert.equal(store.setSection(c.id, 'PME 999999'), false);
  store.toggleSemesterLock('y2s1');
  assert.equal(store.setSection(c.id, 'PME 200101'), false);
  assert.equal(find(c.id).section, null);
});

/* ── 自訂時段 ─────────────────────────────── */
test('自訂時段：設了就有時段，整理成課表順序；清除後回到沒有時段', () => {
  const c = add('自己找的課', 'y2s1');
  assert.equal(store.sectionOf(c), null);
  assert.equal(store.setCustomSlots(c.id, ['W2', 'M3', 'M3']), true);
  assert.deepEqual(find(c.id).customSlots, ['M3', 'W2']);
  assert.equal(store.sectionOf(find(c.id)).custom, true);
  store.setCustomSlots(c.id, []);
  assert.equal(find(c.id).customSlots, null);
  assert.equal(store.sectionOf(find(c.id)), null);
});

test('自訂時段與選班互相取代', () => {
  const c = add('工程數學一', 'y2s1');
  store.setSection(c.id, 'PME 200101');
  store.setCustomSlots(c.id, ['F1']);
  assert.equal(find(c.id).section, null);
  assert.deepEqual(find(c.id).customSlots, ['F1']);
  store.setSection(c.id, 'PME 200101');
  assert.equal(find(c.id).customSlots, null);
  assert.equal(find(c.id).section, 'PME 200101');
});

test('換學期或拖回待排課程就清掉自訂時段', () => {
  const c = add('自己找的課', 'y2s1');
  store.setCustomSlots(c.id, ['M1']);
  store.assign(c.id, 'y2s2');
  assert.equal(find(c.id).customSlots, null);
  store.setCustomSlots(c.id, ['M1']);
  store.assign(c.id, null);
  assert.equal(find(c.id).customSlots, null);
});

test('待排課程與鎖住的學期不能設自訂時段', () => {
  const c = add('自己找的課');
  assert.equal(store.setCustomSlots(c.id, ['M1']), false);
  store.assign(c.id, 'y2s1');
  store.toggleSemesterLock('y2s1');
  assert.equal(store.setCustomSlots(c.id, ['M1']), false);
  assert.equal(find(c.id).customSlots, null);
});

test('自訂時段跟著匯出、匯入', () => {
  const c = add('自己找的課', 'y2s1');
  store.setCustomSlots(c.id, ['T3', 'T4']);
  const json = store.exportPlan();
  store.reset();
  store.importPlan(json);
  assert.deepEqual(store.plan.courses[0].customSlots, ['T3', 'T4']);
});

/* ── 排到沒開課的學期 ─────────────────────── */
test('學期提醒：只在下學期開的課排到上學期就提醒，排回下學期或設了自訂時段就不提醒', () => {
  const c = add('工程數學二'); // 開課資料裡只有 114-2
  assert.equal(store.termHintOf(c), null); // 待排課程：還沒有學期
  store.assign(c.id, 'y2s1'); // 115-1
  assert.deepEqual(store.termHintOf(find(c.id)), { term: 2, terms: ['114-2'] });
  store.setCustomSlots(c.id, ['M1']);
  assert.equal(store.termHintOf(find(c.id)), null);
  store.assign(c.id, 'y2s2'); // 115-2：沒有當學期資料，但下學期有開過
  assert.equal(store.termHintOf(find(c.id)), null);
});

test('學期提醒：開課資料裡找不到的課不提醒', () => {
  const c = add('自己找的課', 'y2s1');
  assert.equal(store.termHintOf(c), null);
});

/* ── 擋修 ─────────────────────────────────── */
test('擋修提醒：先修課沒排在更早的學期就提醒，同學期不算', () => {
  const inv = add('投資學'); // 開課資料：擋修「財務管理-成績需C-以上」
  assert.equal(store.prereqHintOf(inv), null); // 待排課程不檢查
  store.assign(inv.id, 'y2s1');
  const hint = store.prereqHintOf(find(inv.id));
  assert.equal(hint.audience, '大學部');
  assert.deepEqual(hint.unmet[0].items.map((i) => i.name), ['財務管理']);

  const fin = add('財務管理', 'y2s1'); // 同一學期：還是不行
  assert.notEqual(store.prereqHintOf(find(inv.id)), null);
  store.assign(fin.id, 'y1s2'); // 排到更早的學期：通過
  assert.equal(store.prereqHintOf(find(inv.id)), null);
});

test('擋修提醒：開課資料裡沒有擋修條件的課不提醒', () => {
  const c = add('財務管理', 'y2s1');
  assert.equal(store.prereqHintOf(c), null);
  const own = add('自己找的課', 'y2s1');
  assert.equal(store.prereqHintOf(own), null);
});

/* ── 通識課（offerings/<學期>/GE.js）────────────── */
test('通識課也能選班：115-1 只開一班的數理思維排進大二上就自動選', () => {
  const c = add('數理思維', 'y2s1');
  assert.equal(c.section, 'GEC 110500');
  assert.deepEqual(store.sectionOf(c).meetings[0].slots, ['M5', 'M6']);
});

test('通識課上下學期都有資料：兩學期都開的課排到下學期不會誤報學期提醒', () => {
  const c = add('統計思維與分析', 'y2s2'); // 114-2、115-1 都有開
  assert.equal(store.termHintOf(c), null);
});
