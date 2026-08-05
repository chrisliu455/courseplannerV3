/**
 * engine/merge.js — 身分模組合併
 *
 * 一個學生的畢業標準 ＝ 主修模組 ＋ 每個額外身分模組。
 * 合併規則：
 *   totalCredits   相加（主修 129 ＋ 輔系 20 ＝ 149）
 *   tags           串接
 *   categories     同 id 的大類會合併 buckets（所有身分的項目都收在「其他身分」底下）
 *   subjectGroups  串接
 *   options        串接
 *
 * 所以「加一個輔系」＝「多合併一個模組」，引擎其他部分完全不用改。
 */

import { toNumber } from './ruleset.js';

export function mergeModules(modules) {
  const active = modules.filter(Boolean);
  const major = active.find((m) => m.type === 'major') || active[0];

  const tags = [];
  const categories = [];
  const subjectGroups = [];
  const options = [];
  let totalCredits = 0;

  active.forEach((m) => {
    totalCredits += toNumber(m.totalCredits);
    (m.tags || []).forEach((t) => tags.push({ ...t, moduleId: m.id }));
    (m.options || []).forEach((o) => options.push({ ...o, moduleId: m.id }));
    (m.subjectGroups || []).forEach((g) => subjectGroups.push({ ...g, moduleId: m.id }));

    (m.categories || []).forEach((cat) => {
      const found = categories.find((c) => c.id === cat.id);
      if (!found) {
        categories.push({ ...cat, buckets: cat.buckets.map((b) => ({ ...b, moduleId: m.id })) });
        return;
      }
      // 同一個大類被多個身分共用（例：兩個輔系都掛在「其他身分」底下）
      found.buckets = [...found.buckets, ...cat.buckets.map((b) => ({ ...b, moduleId: m.id }))];
      if (cat.minCredits != null) {
        found.minCredits = toNumber(found.minCredits) + toNumber(cat.minCredits);
      }
    });
  });

  return {
    id: active.map((m) => m.id).join('+'),
    label: buildLabel(active),
    source: major ? major.source : '',
    totalCredits,
    modules: active.map((m) => ({ id: m.id, type: m.type, label: m.label, credits: toNumber(m.totalCredits) })),
    tags,
    categories,
    subjectGroups,
    options,
  };
}

function buildLabel(modules) {
  return modules.map((m) => `${typeLabel(m.type)}${m.label}`).join('＋') || '尚未設定身分';
}

export function typeLabel(type) {
  return { major: '主修', minor: '輔系', doubleMajor: '雙主修', program: '學分學程' }[type] || '身分';
}

/**
 * 自訂身分：使用者自己填名稱與學分，臨時組出一個模組。
 * 會自動長出一個專屬標籤與一個項目，掛在「其他身分」大類底下。
 */
export function customModule(identity) {
  const key = identity.id;
  return {
    id: key,
    type: identity.type || 'program',
    label: identity.label,
    totalCredits: toNumber(identity.credits),
    custom: true,
    tags: [{ id: `tag.${key}`, label: `${typeLabel(identity.type)}：${identity.label}`, color: identity.color || '#5B4B8A' }],
    categories: [
      {
        id: 'cat.identity',
        label: '其他身分',
        color: '#5B4B8A',
        minCredits: toNumber(identity.credits),
        buckets: [
          {
            id: `bkt.${key}`,
            label: `${typeLabel(identity.type)}：${identity.label}`,
            tags: [`tag.${key}`],
            minCredits: toNumber(identity.credits),
          },
        ],
      },
    ],
    subjectGroups: [],
  };
}
