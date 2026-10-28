/**
 * offerings/index.js — 開課資料註冊表
 *
 * 規則集（rulesets/）講的是「畢業要修什麼」；這裡講的是「某學期實際開了什麼課」：
 * 科號、上課時間、教室、教師、備註、擋修。之後的衝堂驗證會用到這些資料。
 *
 * ── 新增一個學期 × 系所 ──────────────────────
 *   1. 在校務資訊系統查好「各系所必選修課程」，停在結果頁
 *   2. 在那個分頁執行 tools/extract-offerings.js，把回傳的 source 存成
 *      offerings/<學期>/<系所>.js（例：offerings/115-2/PME.js）
 *   3. 在下面多一行 import，並加進 OFFERINGS
 * 通識課改用「通識課程總錄」頁面與 tools/extract-ge-offerings.js，存成 offerings/<學期>/GE.js。
 *
 * ui/store.js 用這份清單來選班、檢查換學期後選的班還在不在（查法見 engine/schedule.js）。
 * 新增檔案後記得跑 npm run build，新檔案才會進 index.html 的 importmap。
 */

// 新增學期 × 系所時，在這裡多一行 import
import pme1142 from './114-2/PME.js';
import qf1142 from './114-2/QF.js';
import ge1142 from './114-2/GE.js';
import pme1151 from './115-1/PME.js';
import qf1151 from './115-1/QF.js';
import ge1151 from './115-1/GE.js';

/** 所有開課資料，一個元素 = 一個學期的一個系所（通識課程總錄當成系所 GE） */
export const OFFERINGS = [pme1142, qf1142, ge1142, pme1151, qf1151, ge1151];

/** 依學期（例 '115-1'）與系所代碼（例 'PME'）取得開課資料，找不到回傳 null */
export function getOffering(semester, dept) {
  return OFFERINGS.find((o) => o.semester === semester && o.dept === dept) || null;
}
