/**
 * rulesets/minor.ee.js — 輔系：電機工程學系
 *
 * 這是一個「額外身分」模組。加進來之後：
 *   畢業總學分 ＋22（主修 129 → 151）
 *   多五個「輔系電機」標籤與對應的五個項目
 *   多一組指定必修科目要打勾
 *
 * 依規定：除應滿足主學系規定最低學分外，應加修電機系規定之輔系應修課程 22 學分。
 *
 * 學分結構（固定 22）：
 *   計算機程式設計 3 ＋ 電機必修六門擇四 12 ＋ 電子電路實驗 2
 *   ＋ 選修實驗一門 2 ＋ 電機系專業選修 3 ＝ 22
 *
 * 結構刻意比照 major.ctm-111.js 裡的「第二專長：電機工程」那一段，
 * 兩份規定長得幾乎一樣，寫法一致比較好對照。
 *
 * ── 官方公告沒寫死、我自己判斷的地方 ────────────────
 * 1. 「一門實驗課」官方寫 2 或 3 學分。這裡以 2 學分當門檻，因為
 *    3 ＋ 12 ＋ 2 ＋ 3 ＋ 2 ＝ 22，剛好等於公告的 22 學分；取 3 就變 23。
 *    實際修到 3 學分的實驗課也會判定通過（門檻是「至少」）。
 *    匯入清單裡那八門實驗一律先給 2 學分，實際學分依開課為準。
 * 2. 「六門擇四」用「至少 4 門」＋「至少 12 學分」兩個條件檢核。
 *    修第五門的話學分會繼續累加到這個項目上，引擎不會擋，也不會另外提醒。
 * 3. 「應修習電機系／電資院開設課程，無法以其他學系開設課程抵免修」
 *    課程資料裡沒有「開課單位」欄位，引擎只比對課名與標籤，無法真的檢查誰開的課。
 *    折衷做法：把六門課的課名寫成「電磁學（電機系）」，科號放在備註。
 *    這樣自己手打的「電磁學」不會對上這份清單，科目判定會顯示沒修滿四門。
 *    但學分判定只看標籤，還是擋不住——真正要擋住得替課程加科號欄位，那是另一件事。
 *    科號取自 major.ee-114.js 既有資料。
 * 4. 「電機系專業選修課程」3 學分沒有具體科目清單，只做學分判定，不列入匯入清單。
 * 5. 計算機程式設計的四個可採計科號（EE2310、CS1355、EECS1110、EECS1111）
 *    寫在備註裡，引擎不做科號比對。
 */

export default {
  id: 'minor.ee',
  type: 'minor',
  label: '電機工程學系',
  short: '電機系',
  totalCredits: 22,
  source: '電機工程學系輔系應修課程（109 學年度課程委員會議通過，109.06.30 修訂）',

  tags: [
    { id: 'tag.minor-ee-prog', label: '輔系電機・計算機程式設計', color: '#4A3F7A' },
    { id: 'tag.minor-ee-core', label: '輔系電機・電機必修', color: '#635497' },
    { id: 'tag.minor-ee-lab', label: '輔系電機・電子電路實驗', color: '#7A6BAE' },
    { id: 'tag.minor-ee-lab2', label: '輔系電機・選修實驗', color: '#9384C2' },
    { id: 'tag.minor-ee-pro', label: '輔系電機・專業選修', color: '#ACA0D4' },
  ],

  categories: [
    {
      id: 'cat.identity', // 固定用這個 id，才會跟其他身分合併在同一個大類
      label: '其他身分',
      color: '#5B4B8A',
      minCredits: 22,
      buckets: [
        {
          id: 'bkt.minor-ee-prog',
          label: '計算機程式設計',
          tags: ['tag.minor-ee-prog'],
          minCredits: 3,
          note: '可採計 EE2310、CS1355、EECS1110、EECS1111',
        },
        {
          id: 'bkt.minor-ee-core',
          label: '電機必修（六門擇四，12 學分）',
          tags: ['tag.minor-ee-core'],
          minCredits: 12,
          note:
            '邏輯設計／訊號與系統／電路學／電子學一、二／電磁學，六門中修四門；' +
            '須修電機系或電資院開設之課程，不得以其他學系開設課程抵免修',
        },
        {
          id: 'bkt.minor-ee-lab',
          label: '電子電路實驗',
          tags: ['tag.minor-ee-lab'],
          minCredits: 2,
          note: '指定必修，與下面的選修實驗是兩件事',
        },
        {
          id: 'bkt.minor-ee-lab2',
          label: '選修實驗（八門任選一門）',
          tags: ['tag.minor-ee-lab2'],
          minCredits: 2,
          note: '公告寫 2 或 3 學分，這裡以 2 學分當門檻；修 3 學分的也算通過',
        },
        {
          id: 'bkt.minor-ee-pro',
          label: '電機系專業選修',
          tags: ['tag.minor-ee-pro'],
          minCredits: 3,
          note: '公告沒有指定科目清單，只做學分判定',
        },
      ],
    },
  ],

  subjectGroups: [
    {
      id: 'grp.minor.ee',
      label: '電機系輔系應修課程（22 學分）',
      note: '電機系專業選修 3 學分沒有指定科目，不在這份清單裡，請自己新增課程並掛上「輔系電機・專業選修」標籤',
      groups: [
        {
          id: 'grp.minor.ee.prog',
          label: '計算機程式設計（必修）',
          rule: { type: 'all' },
          items: [
            {
              name: '計算機程式設計',
              credit: 3,
              tag: 'tag.minor-ee-prog',
              note: 'EE2310、CS1355、EECS1110、EECS1111 皆可採計',
            },
          ],
        },
        {
          id: 'grp.minor.ee.core',
          label: '電機必修（六門擇四）',
          note:
            '須修電機系／電資院開設之課程，不得以其他學系課程抵免修。' +
            '課名刻意加上「（電機系）」，跟主修清單裡同名的別系課程區隔開；' +
            '請從這份清單匯入，不要自己手打課名',
          rule: { type: 'atLeastCourses', n: 4 },
          items: [
            { name: '邏輯設計（電機系）', credit: 3, tag: 'tag.minor-ee-core', note: 'EECS1010' },
            { name: '訊號與系統（電機系）', credit: 3, tag: 'tag.minor-ee-core', note: 'EECS2020' },
            { name: '電路學（電機系）', credit: 3, tag: 'tag.minor-ee-core', note: 'EE2210' },
            { name: '電子學一（電機系）', credit: 3, tag: 'tag.minor-ee-core', note: 'EE2250' },
            { name: '電子學二（電機系）', credit: 3, tag: 'tag.minor-ee-core', note: 'EE2260' },
            { name: '電磁學（電機系）', credit: 3, tag: 'tag.minor-ee-core', note: 'EE2140' },
          ],
        },
        {
          id: 'grp.minor.ee.lab',
          label: '電子電路實驗（必修）',
          rule: { type: 'all' },
          items: [{ name: '電子電路實驗', credit: 2, tag: 'tag.minor-ee-lab' }],
        },
        {
          id: 'grp.minor.ee.lab2',
          label: '選修實驗（八門任選一門）',
          note: '學分依實際開課為準，這裡一律先給 2 學分',
          rule: { type: 'atLeastCourses', n: 1 },
          items: [
            { name: '邏輯設計實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
            { name: '電動機械實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
            { name: '數位訊號處理實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
            { name: '光電實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
            { name: '嵌入式系統與實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
            { name: '固態電子實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
            { name: '通訊系統實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
            { name: '積體電路設計實驗', credit: 2, tag: 'tag.minor-ee-lab2' },
          ],
        },
      ],
    },
  ],
};
