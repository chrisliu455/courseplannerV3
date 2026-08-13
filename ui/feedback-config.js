/**
 * ui/feedback-config.js — 「回報問題」要送到哪裡
 *
 * 這個檔案只有設定值，沒有邏輯。要換收件管道時，改這裡就好。
 *
 * ── 怎麼填 ───────────────────────────────────────────────
 * 1. 建一份 Google 表單，四個問題，順序無所謂，但型態要對：
 *      問題描述     → 長答案
 *      聯絡 email   → 簡答
 *      診斷資訊     → 長答案
 *      完整規劃     → 長答案
 *    四題都**不要**設成必填。程式一定會把四個欄位都送出去，
 *    但使用者沒填的就是空字串，欄位設必填的話整筆會被 Google 退掉。
 *
 * 2. 表單右上角 ⋮ →「取得預先填入的連結」，每格填一個好認的假值
 *    （AAA、BBB、CCC、DDD），按「取得連結」複製。
 *    連結裡的 entry.123456789=AAA 前半段就是那一題的欄位 ID。
 *
 * 3. formId 是表單網址 /d/e/ 和 /viewform 中間那一長串。
 *
 * 沒填完之前功能不會壞：isConfigured() 是 false 時，
 * 送出鈕會改走「複製內容」的備援路徑，不會送出一筆壞資料。
 */

export const FEEDBACK = {
  /** https://docs.google.com/forms/d/e/【這一段】/viewform */
  formId: '1FAIpQLSfcV193p0U8Lf5U-xl7DFpCwZn--Rrgj9sBCrb_WPJESWk7eg',

  /** 對應「courseplannerV3 問題回報」表單的四題 */
  fields: {
    message: 'entry.1171730888',      // 問題描述（詳答）
    email: 'entry.806623100',         // 聯絡 email（簡答）
    diagnostics: 'entry.740239293',   // 診斷資訊（詳答）
    plan: 'entry.148761236',          // 完整規劃（詳答）
  },

  /** 送不出去時顯示給使用者的備援信箱；留空就只提示「複製內容」 */
  contactEmail: '',
};

/** 沒設定完整就別送 —— 送出去也只會變成一筆對不上欄位的垃圾資料 */
export const isConfigured = () => Boolean(FEEDBACK.formId && FEEDBACK.fields.message);
