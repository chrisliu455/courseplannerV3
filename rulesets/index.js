/**
 * rulesets/index.js — 身分模組註冊表
 *
 * ── 新增科系就是改這個檔案 ──────────────────────
 * 主修：           複製 _TEMPLATE.major.js → major.你的系.js → 加到 MAJORS
 * 輔系／雙主修／學分學程：複製 _TEMPLATE.minor.js → minor.你的系.js → 加到 IDENTITIES
 *
 * 兩個範本裡有完整註解，照著填就好。
 * 加完存檔重整，清單會自動出現，引擎和 UI 一行都不用改。
 *
 * 數字算錯（各大類加總 ≠ 畢業總學分、標籤沒歸屬、id 撞名⋯⋯）時，
 * 判定結果最上方會直接列出問題，不會默默算錯。
 */

// 新增科系時，在這裡多一行 import
import majorDongji114 from './major.dongji-114.js';
import majorDongji113 from './major.dongji-113.js';
import majorEE114 from './major.ee-114.js';
import minorQf from './minor.qf.js';

/** 主修：一次只能選一個（畫面上是單選） */
export const MAJORS = [majorDongji114, majorDongji113, majorEE114];

/** 額外身分：可以複選（畫面上是勾選） */
export const IDENTITIES = [minorQf];

export const ALL_MODULES = [...MAJORS, ...IDENTITIES];

/** 預設主修 */
export const DEFAULT_MAJOR_ID = majorDongji114.id;

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
