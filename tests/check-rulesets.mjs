/**
 * 規則集健檢：新增或修改系所規定之後，上傳前先跑這支。
 *
 *   node tests/check-rulesets.mjs
 *
 * 檢查項目：
 *   - 結構錯誤（標籤 id 重複、項目引用了不存在的標籤、溢出目標不存在⋯⋯）
 *   - 學分算術（各大類 minCredits 加總是否等於 totalCredits）
 *   - 科目判定裡引用的標籤是否都存在
 *   - 主修 ＋ 每個額外身分的組合是否都成立
 *
 * 不需要 jsdom，純 Node 就能跑。
 */

import { validateRuleset, mergeModules, buildIndex } from '../engine/index.js';
import { MAJORS, IDENTITIES } from '../rulesets/index.js';

let problems = 0;
const say = (s = '') => console.log(s);
const bad = (s) => {
  problems++;
  console.log('  ✗ ' + s);
};
const ok = (s) => console.log('  ✓ ' + s);

function checkModule(mod) {
  say(`\n【${mod.label}】${mod.id}`);

  // 1. 引擎自帶的結構健檢
  const issues = validateRuleset(mod);
  issues.filter((i) => i.level === 'error').forEach((i) => bad(i.message));
  issues.filter((i) => i.level === 'warn').forEach((i) => say('  ⚠ ' + i.message));
  if (!issues.some((i) => i.level === 'error')) ok('結構無誤');

  // 2. 學分算術
  const sum = (mod.categories || [])
    .filter((c) => c.countsTowardTotal !== false)
    .reduce((s, cat) => {
      const target =
        cat.minCredits != null
          ? Number(cat.minCredits)
          : cat.buckets.reduce((n, b) => n + (Number(b.minCredits) || 0), 0);
      return s + target;
    }, 0);

  if (sum !== Number(mod.totalCredits)) {
    bad(`學分對不上：各大類加總 ${sum}，但 totalCredits 寫 ${mod.totalCredits}（差 ${sum - mod.totalCredits}）`);
  } else {
    ok(`學分加總正確：${sum}`);
  }

  // 3. 每個大類底下，項目加總是否等於大類的 minCredits
  (mod.categories || []).forEach((cat) => {
    if (cat.minCredits == null) return;
    const bsum = cat.buckets.reduce((n, b) => n + (Number(b.minCredits) || 0), 0);
    if (bsum !== Number(cat.minCredits)) {
      say(`  ⚠ 「${cat.label}」大類寫 ${cat.minCredits}，底下項目加總 ${bsum}`);
    }
  });

  // 4. 科目判定引用的標籤是否存在
  const tagIds = new Set((mod.tags || []).map((t) => t.id));
  const missing = new Set();
  const walk = (g) => {
    (g.items || []).forEach((i) => {
      if (i.tag && !tagIds.has(i.tag)) missing.add(`${g.label} › ${i.name} → ${i.tag}`);
    });
    (g.groups || []).forEach(walk);
  };
  (mod.subjectGroups || []).forEach(walk);
  if (missing.size) [...missing].forEach((m) => bad(`科目引用了不存在的標籤：${m}`));
  else ok('科目引用的標籤都存在');

  // 5. 選項引用檢查
  const optionIds = new Set((mod.options || []).map((o) => o.id));
  const badWhen = [];
  const walkWhen = (g) => {
    if (g.when && g.when.option && !optionIds.has(g.when.option)) {
      badWhen.push(`${g.label} → when.option='${g.when.option}'`);
    }
    (g.groups || []).forEach(walkWhen);
  };
  (mod.subjectGroups || []).forEach(walkWhen);
  (mod.categories || []).forEach((cat) => (cat.buckets || []).forEach(walkWhen));
  if (badWhen.length) badWhen.forEach((b) => bad(`when 引用了不存在的選項：${b}`));

  // 6. 統計
  let itemCount = 0;
  const count = (g) => {
    itemCount += (g.items || []).length;
    (g.groups || []).forEach(count);
  };
  (mod.subjectGroups || []).forEach(count);
  say(`  · 標籤 ${(mod.tags || []).length} 個｜大類 ${(mod.categories || []).length} 個｜規定科目 ${itemCount} 門｜應修 ${mod.totalCredits} 學分`);
}

say('══ 逐一檢查各身分模組 ══');
[...MAJORS, ...IDENTITIES].forEach(checkModule);

say('\n══ 檢查合併後的組合 ══');
MAJORS.forEach((major) => {
  const combos = [[major], ...IDENTITIES.map((idn) => [major, idn])];
  combos.forEach((mods) => {
    const merged = mergeModules(mods);
    const errs = validateRuleset(merged).filter((i) => i.level === 'error');
    const name = mods.map((m) => m.label).join(' ＋ ');
    if (errs.length) {
      bad(`${name}：${errs.map((e) => e.message).join('；')}`);
    } else {
      buildIndex(merged, {});
      ok(`${name} → 應修 ${merged.totalCredits} 學分`);
    }
  });
});

say(problems ? `\n發現 ${problems} 個問題，修好再上傳。\n` : '\n全部通過，可以上傳。\n');
process.exitCode = problems ? 1 : 0;
