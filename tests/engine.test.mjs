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

test('主修的 11 個標籤全部有對應到項目與大類', () => {
  const table = tagTable(plan([]), ruleset);
  assert.equal(table.length, 11); // 含核心通識向度一～四
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
      course('哲學概論', 3, 'tag.ge-core-1'),
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

test('沒有任何項目設學分上限', () => {
  const caps = [];
  ruleset.categories.forEach((cat) =>
    cat.buckets.forEach((b) => {
      if (b.cap != null) caps.push(`${cat.label} › ${b.label} = ${b.cap}`);
      if (b.overflowTo) caps.push(`${cat.label} › ${b.label} 設了溢出目標`);
    })
  );
  assert.deepEqual(caps, [], '規則集不應有學分上限或溢出設定');
});

test('物理超修的學分留在物理領域，不會溢出', () => {
  const r = evaluate(
    plan([
      course('工程光學', 3, 'tag.physics'),
      course('電磁學', 3, 'tag.physics'),
      course('普通物理一', 3, 'tag.physics'), // 五選二之外多修的第 3 門
    ]),
    ruleset
  );
  assert.equal(findBucket(r, 'bkt.physics').earned, 9, '9 學分全留在物理領域');
  assert.equal(findBucket(r, 'bkt.elective').earned, 0, '其他選修拿不到超修的學分');
  assert.equal(r.credit.total.actualCredits, 9);
  assert.equal(r.credit.total.earned, 9, '認列學分等於實修學分');
  assert.equal(r.credit.total.overCounted, 0, '沒有任何學分因額滿而消失');
});

test('專業學程超修也全數計入', () => {
  const courses = ['控制系統一', '控制系統二', '電子學二', '振動學', '數值分析', '電磁學'].map((n) =>
    course(n, 3, 'tag.track')
  );
  const r = evaluate(plan(courses, { track: 'control' }), ruleset);
  assert.equal(findBucket(r, 'bkt.track').earned, 18, '18 學分全計入專業學程');
  assert.equal(findBucket(r, 'bkt.elective').earned, 0);
});

test('認列學分永遠等於實修學分（沒有上限就不會有學分被丟掉）', () => {
  const r = evaluate(
    plan(
      [
        course('大學中文', 2, 'tag.chinese'),
        course('工程光學', 3, 'tag.physics'),
        course('電磁學', 3, 'tag.physics'),
        course('近代物理導論', 3, 'tag.physics'),
        course('普通物理一', 3, 'tag.physics'),
        course('控制系統一', 3, 'tag.track'),
      ],
      { track: 'control' }
    ),
    ruleset
  );
  assert.equal(r.credit.total.earned, r.credit.total.actualCredits);
  assert.equal(r.credit.exceptions.dropped.length, 0);
});

test('引擎仍支援上限與溢出（只是動機系沒用到）', () => {
  const capped = {
    id: 'test',
    label: '測試',
    totalCredits: 10,
    tags: [
      { id: 'tag.a', label: 'A', color: '#000' },
      { id: 'tag.b', label: 'B', color: '#111' },
    ],
    categories: [
      {
        id: 'cat.t',
        label: '測試大類',
        minCredits: 10,
        buckets: [
          { id: 'bkt.a', label: 'A 項', tags: ['tag.a'], minCredits: 6, cap: 6, overflowTo: 'bkt.b' },
          { id: 'bkt.b', label: 'B 項', tags: ['tag.b'], minCredits: 4 },
        ],
      },
    ],
    subjectGroups: [],
  };
  const r = evaluate(
    { courses: [course('甲', 3, 'tag.a'), course('乙', 3, 'tag.a'), course('丙', 3, 'tag.a')] },
    capped
  );
  assert.equal(findBucket(r, 'bkt.a').earned, 6);
  assert.equal(findBucket(r, 'bkt.b').earned, 3);
  assert.equal(findBucket(r, 'bkt.b').courses[0].viaOverflow, true);
});

test('一門課的學分只會出現在一個領域', () => {
  const r = evaluate(
    plan([
      course('工程光學', 3, 'tag.physics'),
      course('電磁學', 3, 'tag.physics'),
      course('普通物理一', 3, 'tag.physics'),
      course('控制系統一', 3, 'tag.track'),
    ]),
    ruleset
  );
  // 每門課在 allocations 裡最多一筆
  Object.entries(r.credit.allocations).forEach(([id, allocs]) => {
    assert.ok(allocs.length <= 1, `課程 ${id} 被分配到 ${allocs.length} 個領域`);
  });
  // 同一個 courseId 不會同時出現在兩個 bucket 的課程清單裡
  const seen = new Map();
  r.credit.categories.forEach((cat) =>
    cat.buckets.forEach((b) =>
      b.courses.forEach((row) => {
        assert.ok(!seen.has(row.courseId), `${row.name} 同時出現在「${seen.get(row.courseId)}」與「${b.label}」`);
        seen.set(row.courseId, b.label);
      })
    )
  );
});

test('工程光學標成物理領域時，專業學程拿不到那 3 學分', () => {
  const p = plan(
    [
      course('工程光學', 3, 'tag.physics'), // 同時符合物理與電控學程選修，但標籤是物理
      course('控制系統一', 3, 'tag.track'),
      course('控制系統二', 3, 'tag.track'),
      course('電子學二', 3, 'tag.track'),
      course('振動學', 3, 'tag.track'),
    ],
    { track: 'control' }
  );
  const r = evaluate(p, ruleset);

  assert.equal(findBucket(r, 'bkt.physics').earned, 3, '學分全給物理領域');
  assert.equal(findBucket(r, 'bkt.track').earned, 12, '專業學程只有 4 門 track 課的 12 學分');
  assert.equal(findBucket(r, 'bkt.track').checks[0].have, 4, '專業學程門數也不計入工程光學');

  // 改標籤成專業學程，學分就整個搬過去
  p.courses[0].tag = 'tag.track';
  const r2 = evaluate(p, ruleset);
  assert.equal(findBucket(r2, 'bkt.physics').earned, 0, '物理領域變成 0');
  assert.equal(findBucket(r2, 'bkt.track').earned, 15);
  assert.equal(findBucket(r2, 'bkt.track').checks[0].have, 5);
});

test('科目判定仍會打勾，但標記出學分落到別處', () => {
  const r = evaluate(
    plan([course('工程光學', 3, 'tag.physics')], { track: 'control' }),
    ruleset
  );
  const physItem = r.subject.groups
    .find((g) => g.id === 'grp.physics')
    .items.find((i) => i.name === '工程光學');
  assert.equal(physItem.checked, true);
  assert.equal(physItem.tagMismatch, false, '在物理群組裡標籤是相符的');

  const trackItem = r.subject.groups
    .find((g) => g.id === 'grp.track.control')
    .groups.find((g) => g.id === 'grp.track.control.elec')
    .items.find((i) => i.name === '工程光學');
  assert.equal(trackItem.checked, true, '有排到就打勾');
  assert.equal(trackItem.tagMismatch, true, '但標籤不是專業學程，要標記出來');
});

test('通識學分夠但沒修核心，不算達標', () => {
  const courses = [];
  for (let i = 0; i < 7; i++) courses.push(course(`通識${i}`, 3, 'tag.ge-general'));
  const r = evaluate(plan(courses), ruleset); // 21 學分但 0 門核心
  const ge = findBucket(r, 'bkt.ge');
  assert.ok(ge.earned >= 20);
  assert.equal(ge.met, false, '學分夠但核心通識不足，應判定未達標');
  const dim = ge.checks.find((k) => k.label.includes('向度'));
  assert.equal(dim.have, 0);
  assert.equal(dim.need, 4);
});

test('核心通識四個向度：修滿四門但集中在同一向度不算達標', () => {
  const same = [];
  for (let i = 1; i <= 4; i++) same.push(course(`向度一課程${i}`, 3, 'tag.ge-core-1'));
  for (let i = 1; i <= 4; i++) same.push(course(`一般通識${i}`, 2, 'tag.ge-general'));
  const r = evaluate(plan(same), ruleset);
  const ge = findBucket(r, 'bkt.ge');
  const dim = ge.checks.find((k) => k.label.includes('向度'));
  assert.equal(ge.earned, 20, '學分是滿的');
  assert.equal(dim.have, 1, '只涵蓋 1 個向度');
  assert.equal(dim.ok, false);
  assert.equal(ge.met, false);
});

test('核心通識四個向度：各修一門就達標', () => {
  const spread = [];
  for (let i = 1; i <= 4; i++) spread.push(course(`向度${i}課程`, 3, `tag.ge-core-${i}`));
  for (let i = 1; i <= 4; i++) spread.push(course(`一般通識${i}`, 2, 'tag.ge-general'));
  const r = evaluate(plan(spread), ruleset);
  const ge = findBucket(r, 'bkt.ge');
  const dim = ge.checks.find((k) => k.label.includes('向度'));
  assert.equal(dim.have, 4);
  assert.equal(dim.ok, true);
  assert.equal(ge.earned, 20);
  assert.equal(ge.met, true);
});

test('核心通識學分跨四個向度合計', () => {
  const r = evaluate(
    plan([
      course('向度一課程', 3, 'tag.ge-core-1'),
      course('向度二課程', 3, 'tag.ge-core-2'),
      course('向度三課程', 2, 'tag.ge-core-3'),
    ]),
    ruleset
  );
  const core = findBucket(r, 'bkt.ge').checks.find((k) => k.label.includes('至少 8 學分'));
  assert.equal(core.have, 8, '三個向度的學分要加總，不是各算各的');
  assert.equal(core.ok, true);
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
  assert.equal(tagTable(plan([]), ruleset).length, 11);
  assert.equal(tagTable(plan([]), withMinor).length, 12);
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
  for (let i = 1; i <= 4; i++) add(`核心通識${i}`, 3, `tag.ge-core-${i}`);
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

test('同名課程排兩次會被抓出來', () => {
  const r = evaluate(
    plan([
      course('工程光學', 3, 'tag.physics'),
      course('工程光學', 3, 'tag.track'), // 匯入時不小心加了兩筆
      course('電磁學', 3, 'tag.physics'),
    ]),
    ruleset
  );
  assert.equal(r.credit.exceptions.duplicates.length, 1);
  assert.equal(r.credit.exceptions.duplicates[0].name, '工程光學');
  assert.equal(r.credit.exceptions.duplicates[0].count, 2);
  assert.deepEqual(r.credit.exceptions.duplicates[0].tags, ['tag.physics', 'tag.track']);
});

test('0 學分課沒有標籤也不會被列為未設標籤', () => {
  const zero = course('體育', 0, null);
  const real = course('不知道算什麼', 3, null);
  const r = evaluate(plan([zero, real]), ruleset);
  assert.equal(r.credit.exceptions.untagged.length, 1, '只有 3 學分那門該被提醒');
  assert.equal(r.credit.exceptions.untagged[0].name, '不知道算什麼');
});

test('沒有重複時 duplicates 是空的', () => {
  const r = evaluate(plan([course('工程光學', 3, 'tag.physics')]), ruleset);
  assert.deepEqual(r.credit.exceptions.duplicates, []);
});

test('工程光學標成物理領域就只會進物理領域，不會跑到其他選修', () => {
  // 五門物理課全排，工程光學排在最後一筆
  const names = ['電磁學', '近代物理導論', '普通物理一', '普通物理二', '工程光學'];
  const r = evaluate(plan(names.map((n) => course(n, 3, 'tag.physics'))), ruleset);

  assert.equal(findBucket(r, 'bkt.physics').earned, 15, '五門 15 學分全留在物理領域');
  assert.equal(findBucket(r, 'bkt.elective').earned, 0, '其他選修一分都不該拿到');

  const rows = findBucket(r, 'bkt.physics').courses.map((x) => x.name);
  assert.ok(rows.includes('工程光學'));
  assert.equal(r.credit.exceptions.dropped.length, 0);
  r.credit.categories.forEach((cat) =>
    cat.buckets.forEach((b) => b.courses.forEach((row) => assert.equal(row.viaOverflow, false)))
  );
});

function findBucket(report, bucketId) {
  for (const cat of report.credit.categories) {
    const b = cat.buckets.find((x) => x.id === bucketId);
    if (b) return b;
  }
  throw new Error(`找不到項目 ${bucketId}`);
}
