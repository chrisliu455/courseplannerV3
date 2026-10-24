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
