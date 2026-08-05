import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluate, tagTable, validateRuleset, mergeModules } from '../engine/index.js';
import major from '../rulesets/major.dongji-113.js';
import minorQf from '../rulesets/minor.qf.js';

/** 只有主修的規則集（129 學分） */
const ruleset = mergeModules([major]);
/** 主修 ＋ 輔系計財（129 ＋ 20 ＝ 149 學分） */
const withMinor = mergeModules([major, minorQf]);

let seq = 0;
const course = (name, credit, tag, semester = 'y1s1') => ({
  id: `c${++seq}`,
  name,
  credit,
  tag,
  semester,
});

const plan = (courses, options = {}) => ({ rulesetId: ruleset.id, options, courses });

test('規則集本身沒有結構錯誤', () => {
  const issues = validateRuleset(ruleset);
  assert.deepEqual(issues.filter((i) => i.level === 'error'), []);
});

test('主修的 8 個標籤全部有對應到項目與大類', () => {
  const table = tagTable(plan([]), ruleset);
  assert.equal(table.length, 8);
  table.forEach((t) => {
    assert.ok(t.bucketId, `${t.label} 沒有對應項目`);
    assert.ok(t.categoryId, `${t.label} 沒有對應大類`);
  });
});

test('學分依標籤累加到正確的大類', () => {
  const r = evaluate(
    plan([
      course('大學中文', 2, 'tag.chinese'),
      course('英文一', 2, 'tag.english'),
      course('微積分一', 3, 'tag.dept'),
      course('哲學概論', 3, 'tag.ge-core'),
    ]),
    ruleset
  );
  const school = r.credit.categories.find((c) => c.id === 'cat.school');
  const dept = r.credit.categories.find((c) => c.id === 'cat.dept');
  assert.equal(school.earned, 7); // 2 + 2 + 3
  assert.equal(dept.earned, 3);
  assert.equal(r.credit.total.actualCredits, 10);
});

test('沒排進學期的課不列入判定', () => {
  const c = course('微積分一', 3, 'tag.dept');
  c.semester = null;
  const r = evaluate(plan([c]), ruleset);
  assert.equal(r.credit.total.actualCredits, 0);
});

test('物理領域超過 6 學分時溢出到其他選修', () => {
  const r = evaluate(
    plan([
      course('工程光學', 3, 'tag.physics'),
      course('電磁學', 3, 'tag.physics'),
      course('普通物理一', 3, 'tag.physics'), // 第 3 門，超出上限
    ]),
    ruleset
  );
  const physics = findBucket(r, 'bkt.physics');
  const elective = findBucket(r, 'bkt.elective');
  assert.equal(physics.earned, 6, '物理領域應停在 6 學分');
  assert.equal(elective.earned, 3, '多的 3 學分應落到其他選修');
  assert.equal(elective.courses[0].viaOverflow, true);
  assert.equal(r.credit.total.actualCredits, 9);
});

test('溢出可以只切一半：4 學分課碰到剩 3 學分空間', () => {
  const r = evaluate(
    plan([
      course('工程光學', 3, 'tag.physics'),
      course('某物理課', 4, 'tag.physics'), // 只能認 3，剩 1 溢出
    ]),
    ruleset
  );
  assert.equal(findBucket(r, 'bkt.physics').earned, 6);
  assert.equal(findBucket(r, 'bkt.elective').earned, 1);
});

test('核心通識未滿 4 門時通識項目不算達標', () => {
  const courses = [];
  for (let i = 0; i < 7; i++) courses.push(course(`通識${i}`, 3, 'tag.ge-general'));
  const r = evaluate(plan(courses), ruleset); // 21 學分但 0 門核心
  const ge = findBucket(r, 'bkt.ge');
  assert.ok(ge.earned >= 20);
  assert.equal(ge.met, false, '學分夠但核心通識門數不足，應判定未達標');
  assert.equal(ge.checks[0].have, 0);
  assert.equal(ge.checks[0].need, 4);
});

test('身分別決定畢業學分：主修 129', () => {
  assert.equal(ruleset.totalCredits, 129);
  const r = evaluate(plan([]), ruleset);
  assert.equal(r.credit.total.target, 129);
});

test('身分別決定畢業學分：主修 129 ＋ 輔系 20 ＝ 149', () => {
  assert.equal(withMinor.totalCredits, 149);
  const r = evaluate(plan([]), withMinor);
  assert.equal(r.credit.total.target, 149);
});

test('加了輔系才有輔系標籤與項目', () => {
  assert.equal(tagTable(plan([]), ruleset).length, 8);
  assert.equal(tagTable(plan([]), withMinor).length, 9);
  assert.ok(!ruleset.categories.some((c) => c.id === 'cat.identity'));
  assert.ok(withMinor.categories.some((c) => c.id === 'cat.identity'));
});

test('輔系學分計入畢業總學分（加修制）', () => {
  const r = evaluate(plan([course('經濟學原理一', 3, 'tag.minor-qf')]), withMinor);
  assert.equal(findBucket(r, 'bkt.minor-qf').earned, 3);
  assert.equal(r.credit.total.earned, 3, '輔系學分要計入總數');
  assert.equal(r.credit.total.remaining, 146);
});

test('輔系指定科目要全部修畢', () => {
  const names = minorQf.subjectGroups[0].items.map((i) => i.name);
  const partial = evaluate(plan(names.slice(0, 3).map((n) => course(n, 3, 'tag.minor-qf'))), withMinor);
  const g1 = partial.subject.groups.find((g) => g.id === 'grp.minor.qf');
  assert.equal(g1.satisfied, false);
  assert.equal(g1.have, 3);
  assert.equal(g1.need, 7);

  const full = evaluate(plan(names.map((n) => course(n, 3, 'tag.minor-qf'))), withMinor);
  const g2 = full.subject.groups.find((g) => g.id === 'grp.minor.qf');
  assert.equal(g2.satisfied, true);
  assert.equal(findBucket(full, 'bkt.minor-qf').earned, 21);
  assert.equal(findBucket(full, 'bkt.minor-qf').met, true, '21 >= 20 應達標');
});

test('沒加輔系時，輔系標籤的課會被標為失效', () => {
  const r = evaluate(plan([course('經濟學原理一', 3, 'tag.minor-qf')]), ruleset);
  assert.equal(r.credit.exceptions.unmapped.length, 1);
  assert.equal(r.credit.total.earned, 0);
});

test('自訂身分：學分要求疊加，並長出自己的標籤與項目', async () => {
  const { customModule } = await import('../engine/index.js');
  const custom = customModule({ id: 'custom.ai', type: 'program', label: '人工智慧學程', credits: 12 });
  const merged = mergeModules([major, minorQf, custom]);
  assert.equal(merged.totalCredits, 161, '129 + 20 + 12');

  const identity = merged.categories.find((c) => c.id === 'cat.identity');
  assert.equal(identity.buckets.length, 2, '輔系與學分學程共用「其他身分」大類');
  assert.equal(identity.minCredits, 32, '20 + 12');

  const r = evaluate(plan([course('機器學習', 3, 'tag.custom.ai')]), merged);
  assert.equal(findBucket(r, 'bkt.custom.ai').earned, 3);
});

test('沒有標籤的課會被單獨列出來提醒', () => {
  const c = course('不知道算什麼', 3, null);
  const r = evaluate(plan([c]), ruleset);
  assert.equal(r.credit.exceptions.untagged.length, 1);
  assert.equal(r.credit.exceptions.untagged[0].name, '不知道算什麼');
});

test('科目判定：排到就打勾', () => {
  const r = evaluate(plan([course('微積分一', 3, 'tag.dept')]), ruleset);
  const dept = r.subject.groups.find((g) => g.id === 'grp.dept');
  const item = dept.items.find((i) => i.name === '微積分一');
  assert.equal(item.checked, true);
  assert.equal(item.semester, 'y1s1');
  assert.equal(dept.items.find((i) => i.name === '微積分二').checked, false);
  assert.equal(dept.satisfied, false);
});

test('科目判定：五選二修滿 2 門就達標', () => {
  const r = evaluate(
    plan([course('工程光學', 3, 'tag.physics'), course('電磁學', 3, 'tag.physics')]),
    ruleset
  );
  const g = r.subject.groups.find((x) => x.id === 'grp.physics');
  assert.equal(g.satisfied, true);
  assert.equal(g.have, 2);
  assert.equal(g.need, 2);
});

test('科目判定：學程巢狀群組，核心 3 門＋選修 2 門才過', () => {
  const withTrack = (names) => plan(names.map((n) => course(n, 3, 'tag.track')), { track: 'control' });

  const partial = evaluate(withTrack(['控制系統一', '控制系統二', '電子學二']), ruleset);
  const g1 = partial.subject.groups.find((g) => g.id === 'grp.track.control');
  assert.equal(g1.groups[0].satisfied, true, '核心 3 門已修畢');
  assert.equal(g1.groups[1].satisfied, false, '選修還沒 2 門');
  assert.equal(g1.satisfied, false);

  const full = evaluate(
    withTrack(['控制系統一', '控制系統二', '電子學二', '振動學', '數值分析']),
    ruleset
  );
  assert.equal(full.subject.groups.find((g) => g.id === 'grp.track.control').satisfied, true);
});

test('未選學程時，四個學程群組都不出現', () => {
  const r = evaluate(plan([]), ruleset);
  assert.equal(r.subject.groups.filter((g) => g.id.startsWith('grp.track')).length, 0);
});

test('課名比對忽略空白', () => {
  const r = evaluate(plan([course('微 積 分 一', 3, 'tag.dept')]), ruleset);
  const item = r.subject.groups
    .find((g) => g.id === 'grp.dept')
    .items.find((i) => i.name === '微積分一');
  assert.equal(item.checked, true);
});

test('標籤跟規則建議不同時會標記出來', () => {
  const r = evaluate(plan([course('微積分一', 3, 'tag.major-elective')]), ruleset);
  const item = r.subject.groups
    .find((g) => g.id === 'grp.dept')
    .items.find((i) => i.name === '微積分一');
  assert.equal(item.checked, true);
  assert.equal(item.tagMismatch, true);
});

test('編輯標籤：把物理領域搬到其他選修，學分跟著搬家', () => {
  const p = plan([course('工程光學', 3, 'tag.physics')]);
  p.tagEdits = { moves: { 'tag.physics': 'bkt.elective' } };
  const r = evaluate(p, ruleset);
  assert.equal(findBucket(r, 'bkt.physics').earned, 0);
  assert.equal(findBucket(r, 'bkt.elective').earned, 3);
});

test('編輯標籤：改名改色不影響計算', () => {
  const p = plan([course('工程光學', 3, 'tag.physics')]);
  p.tagEdits = { tags: { 'tag.physics': { label: '基礎科學', color: '#000000' } } };
  const r = evaluate(p, ruleset);
  assert.equal(findBucket(r, 'bkt.physics').earned, 3);
  assert.equal(tagTable(p, ruleset).find((t) => t.id === 'tag.physics').label, '基礎科學');
});

test('新增自訂標籤並掛到既有項目', () => {
  const p = plan([course('校外實習', 2, 'tag.internship')]);
  p.tagEdits = {
    custom: [{ id: 'tag.internship', label: '校外實習', color: '#555', bucket: 'bkt.elective' }],
  };
  const r = evaluate(p, ruleset);
  assert.equal(findBucket(r, 'bkt.elective').earned, 2);
  assert.equal(r.credit.exceptions.unmapped.length, 0);
});

test('引擎是純函式：不會改到傳進去的 plan 或 ruleset', () => {
  const p = plan([course('工程光學', 3, 'tag.physics')]);
  const before = JSON.stringify({ p, ruleset });
  evaluate(p, ruleset);
  assert.equal(JSON.stringify({ p, ruleset }), before);
});

test('全部修滿時判定畢業達標', () => {
  const courses = [];
  const add = (n, cr, tag) => courses.push(course(n, cr, tag));

  ruleset.subjectGroups
    .find((g) => g.id === 'grp.school')
    .items.forEach((i) => add(i.name, i.credit, i.tag));
  ruleset.subjectGroups
    .find((g) => g.id === 'grp.dept')
    .items.forEach((i) => add(i.name, i.credit, i.tag));
  add('工程光學', 3, 'tag.physics');
  add('電磁學', 3, 'tag.physics');
  for (let i = 0; i < 4; i++) add(`核心通識${i}`, 3, 'tag.ge-core');
  for (let i = 0; i < 3; i++) add(`一般通識${i}`, 3, 'tag.ge-general');
  ['控制系統一', '控制系統二', '電子學二', '振動學', '數值分析'].forEach((n) =>
    add(n, 3, 'tag.track')
  );
  for (let i = 0; i < 7; i++) add(`選修${i}`, 3, 'tag.major-elective');

  const r = evaluate(plan(courses, { track: 'control' }), ruleset);

  assert.equal(findBucket(r, 'bkt.dept').earned, 58, '系定必修應剛好 58');
  assert.equal(r.subject.allSatisfied, false, '零學分必修沒排，科目判定仍未全過');
  r.credit.categories
    .filter((c) => c.countsTowardTotal)
    .forEach((c) => assert.equal(c.met, true, `${c.label} 應達標，目前 ${c.earned}/${c.target}`));
  assert.ok(r.credit.total.earned >= 129, `總認列 ${r.credit.total.earned} 應 >= 129`);
  assert.equal(r.credit.total.met, true);
});

function findBucket(report, bucketId) {
  for (const cat of report.credit.categories) {
    const b = cat.buckets.find((x) => x.id === bucketId);
    if (b) return b;
  }
  throw new Error(`找不到項目 ${bucketId}`);
}
