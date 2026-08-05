/**
 * rulesets/index.js — 規則集註冊表
 *
 * 新增系所：在 rulesets/ 底下建一份新檔案，然後在這裡 import 進來、加到 RULESETS。
 * UI 的下拉選單會自動出現，不用改其他地方。
 */

import dongji113 from './dongji-113.js';

export const RULESETS = [dongji113];

export const DEFAULT_RULESET_ID = dongji113.id;

export function getRuleset(id) {
  return RULESETS.find((r) => r.id === id) || RULESETS[0];
}

/** 四年八學期，UI 的課表格子。 */
export const SEMESTERS = [
  { id: 'y1s1', year: '大一', term: '上' },
  { id: 'y1s2', year: '大一', term: '下' },
  { id: 'y2s1', year: '大二', term: '上' },
  { id: 'y2s2', year: '大二', term: '下' },
  { id: 'y3s1', year: '大三', term: '上' },
  { id: 'y3s2', year: '大三', term: '下' },
  { id: 'y4s1', year: '大四', term: '上' },
  { id: 'y4s2', year: '大四', term: '下' },
];
