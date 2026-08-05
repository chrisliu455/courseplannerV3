/**
 * rulesets/index.js — 身分模組註冊表
 *
 * 新增主修系所：建一份 major.xxx.js，import 進來加到 MAJORS
 * 新增輔系／雙主修／學分學程：建一份 minor.xxx.js 之類，加到 IDENTITIES
 *
 * 下拉選單會自動出現，引擎和 UI 都不用改。
 */

import majorDongji113 from './major.dongji-113.js';
import minorQf from './minor.qf.js';

/** 主修：一次只能選一個 */
export const MAJORS = [majorDongji113];

/** 額外身分：可以加多個（輔系、雙主修、學分學程⋯⋯） */
export const IDENTITIES = [minorQf];

export const ALL_MODULES = [...MAJORS, ...IDENTITIES];

export const DEFAULT_MAJOR_ID = majorDongji113.id;

export function getModule(id) {
  return ALL_MODULES.find((m) => m.id === id) || null;
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
