/**
 * engine/index.js — 判定引擎對外的唯一入口
 *
 * UI 只需要知道這一個函式：
 *   const report = evaluate(plan, ruleset);
 *
 * 引擎是純函式：同樣的 plan + ruleset 一定得到同樣的 report，
 * 不碰 DOM、不碰 localStorage、不碰 window，所以可以直接在 Node 裡跑測試。
 *
 * ── plan（學生的規劃）─────────────────────────
 * {
 *   rulesetId: 'dongji-113',
 *   options:  { track:'control', minor:'qf' },
 *   courses:  [{ id, name, credit, tag, semester, note }],
 *   tagEdits: { tags:{}, moves:{}, custom:[] }
 * }
 *
 * ── report（判定結果）─────────────────────────
 * {
 *   subject: { groups, allSatisfied, totals, missing },
 *   credit:  { categories, total, exceptions, allocations },
 *   issues:  [{ level, message }]
 * }
 */

import { applyTagEdits, buildIndex, validateRuleset } from './ruleset.js';
import { evaluateSubjects } from './subject.js';
import { evaluateCredits } from './credit.js';

export function evaluate(plan, baseRuleset) {
  const ruleset = applyTagEdits(baseRuleset, plan.tagEdits || {});
  const issues = validateRuleset(ruleset);
  const index = buildIndex(ruleset, plan.options || {});

  return {
    rulesetId: ruleset.id,
    rulesetLabel: ruleset.label,
    subject: evaluateSubjects(plan, ruleset),
    credit: evaluateCredits(plan, ruleset, index),
    issues,
  };
}

/** 給 UI 用的展平標籤表：一次拿到標籤 → 項目 → 大類 的對照。 */
export function tagTable(plan, baseRuleset) {
  const ruleset = applyTagEdits(baseRuleset, plan.tagEdits || {});
  const index = buildIndex(ruleset, plan.options || {});
  return ruleset.tags.map((t) => {
    const bucketId = index.bucketOfTag.get(t.id);
    const bucket = bucketId ? index.bucketById.get(bucketId) : null;
    return {
      ...t,
      bucketId: bucketId || null,
      bucketLabel: bucket ? bucket.label : null,
      categoryId: bucket ? bucket.categoryId : null,
      categoryLabel: bucket ? bucket.categoryLabel : null,
      active: bucket ? bucket.active : false,
    };
  });
}

export { applyTagEdits, buildIndex, validateRuleset } from './ruleset.js';
export { normalizeName, isCounted, isActive } from './ruleset.js';
