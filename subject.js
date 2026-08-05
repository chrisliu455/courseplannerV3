/**
 * engine/subject.js — 科目判定
 *
 * 規則：規定要修的科目，只要有排進學期就打勾。
 *
 * 群組可以巢狀，達成條件有四種：
 *   { type:'all' }                 全部科目都要修（預設）
 *   { type:'atLeastCourses', n:2 } 至少修 n 門（五選二用這個）
 *   { type:'atLeastCredits', n:6 } 至少修滿 n 學分
 *   { type:'optional' }            只列出來參考，不影響達標
 */

import { isActive, isCounted, normalizeName, toNumber } from './ruleset.js';

export function evaluateSubjects(plan, ruleset) {
  const options = plan.options || {};

  // 課名 → 已排課程（同名多筆時取第一筆）
  const byName = new Map();
  (plan.courses || []).filter(isCounted).forEach((c) => {
    const key = normalizeName(c.name);
    if (!byName.has(key)) byName.set(key, c);
  });

  const groups = (ruleset.subjectGroups || [])
    .filter((g) => isActive(g, options))
    .map((g) => walkGroup(g, byName, options));

  const counted = groups.filter((g) => !g.optional);
  const flat = flatten(groups);

  return {
    groups,
    allSatisfied: counted.every((g) => g.satisfied),
    totals: {
      required: flat.filter((i) => !i.optional).length,
      checked: flat.filter((i) => !i.optional && i.checked).length,
    },
    missing: flat.filter((i) => !i.optional && !i.checked).map((i) => i.name),
  };
}

function walkGroup(group, byName, options) {
  const rule = group.rule || { type: 'all' };
  const optional = Boolean(group.optional) || rule.type === 'optional';

  const children = (group.groups || [])
    .filter((g) => isActive(g, options))
    .map((g) => walkGroup(g, byName, options));

  const items = (group.items || []).map((item) => matchItem(item, byName, optional));

  const checkedItems = items.filter((i) => i.checked);
  const checkedCredits = round2(checkedItems.reduce((s, i) => s + i.credit, 0));

  let have, need, unit, satisfied;
  if (children.length) {
    have = children.filter((c) => c.satisfied || c.optional).length;
    need = children.filter((c) => !c.optional).length;
    unit = '項';
    satisfied = children.every((c) => c.optional || c.satisfied);
  } else if (rule.type === 'atLeastCourses') {
    have = checkedItems.length;
    need = rule.n;
    unit = '門';
    satisfied = have >= need;
  } else if (rule.type === 'atLeastCredits') {
    have = checkedCredits;
    need = rule.n;
    unit = '學分';
    satisfied = have >= need;
  } else {
    have = checkedItems.length;
    need = items.length;
    unit = '門';
    satisfied = have >= need;
  }

  return {
    id: group.id,
    label: group.label,
    note: group.note || '',
    defaultTag: group.defaultTag || null,
    optional,
    rule,
    have,
    need,
    unit,
    satisfied: optional ? true : satisfied,
    rawSatisfied: satisfied,
    items,
    groups: children,
    missing: items.filter((i) => !i.checked).map((i) => i.name),
  };
}

function matchItem(item, byName, optional) {
  const names = [item.name, ...(item.aliases || [])];
  let hit = null;
  for (const n of names) {
    const found = byName.get(normalizeName(n));
    if (found) {
      hit = found;
      break;
    }
  }
  return {
    name: item.name,
    credit: toNumber(item.credit),
    note: item.note || '',
    defaultTag: item.tag || null,
    optional,
    checked: Boolean(hit),
    courseId: hit ? hit.id : null,
    semester: hit ? hit.semester : null,
    actualTag: hit ? hit.tag || null : null,
    // 排了課但標籤跟規則建議的不一樣，通常是學分會算錯的前兆
    tagMismatch: Boolean(hit && item.tag && hit.tag && hit.tag !== item.tag),
  };
}

function flatten(groups) {
  const out = [];
  groups.forEach((g) => {
    g.items.forEach((i) => out.push(i));
    if (g.groups.length) out.push(...flatten(g.groups));
  });
  return out;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
