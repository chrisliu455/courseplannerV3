/**
 * rulesets/major.ee-114.js — 主修：電機工程學系 114 學年入學
 *
 * 依據：114 學年度電機系必修科目、學分數暨畢業總學分表
 *
 * 學分結構（加總 128）：
 *   校定必修 30 ＝ 大學中文 2 ＋ 英文領域 8 ＋ 通識 20
 *   系定必修 56 ＝ 指定科目 53 ＋ 數理必選 3
 *   專業選修 33 ＝ 必選實驗 6 ＋ 電機資訊專業選修 27
 *   其餘選修  9
 *
 * ── 表格沒寫、我自己判斷的地方 ────────────────────
 * 1. 「數理必選」清單上各課程的學分數，表格只給科號沒給學分，
 *    這裡填的是推估值（一般課程 3、實驗 1）。匯入後可在課程卡片上改。
 * 2. 「必選實驗」6 學分 ÷ 至少三門 ＝ 每門 2 學分，由此推得。
 * 3. 「英文領域 8 學分」表格沒有列出具體科目，所以只做學分判定、
 *    科目判定不列科目。免修 2 學分的規定請自行斟酌。
 * 4. 「核心必修 8-12、選修 8-12」的上限 12 沒有另外設限制：
 *    兩者都 ≥ 8 且合計 20 時，自然不可能有一邊超過 12。
 * 5. 核心通識拆成向度一～向度四四個標籤，修課時要自己選對向度，
 *    引擎才能檢核「四個不同向度各至少一門」。
 * 6. 中五學制另加 12 學分：這裡沒有內建，請用畫面上的「自訂身分」
 *    新增一個 12 學分的身分。
 * 7. 「學習護照 12 點認證」不是學分，放在零學分必修裡當作打勾項目。
 */

export default {
  id: 'major.ee-114',
  type: 'major',
  label: '電機工程學系',
  short: '電機系',
  admissionYear: 114,
  totalCredits: 128,
  source: '114 學年度電機系必修科目、學分數暨畢業總學分表',
  dataNote: '「數理必選」各課程的學分數為推估值，匯入後請依實際開課調整',

  options: [],

  /* ── 標籤 ──────────────────────────────────── */
  tags: [
    { id: 'tag.chinese', label: '大學中文', color: '#9C5B3C' },
    { id: 'tag.english', label: '英文領域', color: '#C08457' },
    { id: 'tag.ge-core-1', label: '核心通識・向度一', color: '#2F4858' },
    { id: 'tag.ge-core-2', label: '核心通識・向度二', color: '#3B5170' },
    { id: 'tag.ge-core-3', label: '核心通識・向度三', color: '#4E6E93' },
    { id: 'tag.ge-core-4', label: '核心通識・向度四', color: '#6389B5' },
    { id: 'tag.ge-general', label: '一般通識', color: '#8A94A8' },
    { id: 'tag.ee-dept', label: '系定必修', color: '#7A2E2E' },
    { id: 'tag.ee-math', label: '數理必選', color: '#9E4B45' },
    { id: 'tag.ee-lab', label: '必選實驗', color: '#4A6FA1' },
    { id: 'tag.ee-pro', label: '電機資訊專業選修', color: '#2F6F6C' },
    { id: 'tag.elective', label: '其餘選修', color: '#B08D3F' },
  ],

  /* ── 學分判定 ───────────────────────────────── */
  categories: [
    {
      id: 'cat.school',
      label: '校定必修',
      color: '#9C5B3C',
      minCredits: 30,
      buckets: [
        { id: 'bkt.chinese', label: '大學中文', tags: ['tag.chinese'], minCredits: 2 },
        {
          id: 'bkt.english',
          label: '英文領域',
          tags: ['tag.english'],
          minCredits: 8,
          note: '通過本校英語能力檢定考試者，得免修選讀英文 2 學分',
        },
        {
          id: 'bkt.ge',
          label: '通識課程',
          tags: ['tag.ge-core-1', 'tag.ge-core-2', 'tag.ge-core-3', 'tag.ge-core-4', 'tag.ge-general'],

          minCredits: 20,
          note: '核心必修 8–12 學分＋選修科目 8–12 學分',
          checks: [
            {
              type: 'minDistinctTags',
              tags: ['tag.ge-core-1', 'tag.ge-core-2', 'tag.ge-core-3', 'tag.ge-core-4'],
              min: 4,
              label: '四個核心向度各至少 1 門',
            },
            {
              type: 'minCreditsOfTag',
              tags: ['tag.ge-core-1', 'tag.ge-core-2', 'tag.ge-core-3', 'tag.ge-core-4'],
              min: 8,
              label: '核心通識至少 8 學分',
            },
            { type: 'minCreditsOfTag', tag: 'tag.ge-general', min: 8, label: '一般通識至少 8 學分' },
          ],
        },
      ],
    },
    {
      id: 'cat.dept',
      label: '系定必修',
      color: '#7A2E2E',
      minCredits: 56,
      buckets: [
        { id: 'bkt.ee-dept', label: '系定必修科目', tags: ['tag.ee-dept'], minCredits: 53 },
        {
          id: 'bkt.ee-math',
          label: '數理必選',
          tags: ['tag.ee-math'],
          minCredits: 3,
          note: '從指定的數理課程清單中至少修習 3 學分',
        },
      ],
    },
    {
      id: 'cat.ee-professional',
      label: '專業選修',
      color: '#4A6FA1',
      minCredits: 33,
      buckets: [
        {
          id: 'bkt.ee-lab',
          label: '必選實驗',
          tags: ['tag.ee-lab'],
          minCredits: 6,
          note: '從八門實驗課程中至少選修三門',
          checks: [{ type: 'minCourses', min: 3, label: '至少修 3 門實驗' }],
        },
        {
          id: 'bkt.ee-pro',
          label: '電機資訊專業選修',
          tags: ['tag.ee-pro'],
          minCredits: 27,
          note: '電資學院專業課程；不含 1 字頭課程，亦不含開課單位不承認為專業選修者',
        },
      ],
    },
    {
      id: 'cat.elective',
      label: '其餘選修',
      color: '#B08D3F',
      minCredits: 9,
      buckets: [{ id: 'bkt.elective', label: '其餘選修', tags: ['tag.elective'], minCredits: 9 }],
    },
  ],

  /* ── 科目判定 ───────────────────────────────── */
  subjectGroups: [
    {
      id: 'grp.school',
      label: '校定必修科目',
      note: '英文領域 8 學分表格未列具體科目，僅做學分判定',
      rule: { type: 'all' },
      items: [{ name: '大學中文', credit: 2, tag: 'tag.chinese' }],
    },
    {
      id: 'grp.ee-dept',
      label: '系定必修科目',
      rule: { type: 'all' },
      defaultTag: 'tag.ee-dept',
      items: [
        { name: '微積分A一', credit: 4, tag: 'tag.ee-dept', aliases: ['微積分一'], note: 'MATH1010，一年級' },
        { name: '微積分A二', credit: 4, tag: 'tag.ee-dept', aliases: ['微積分二'], note: 'MATH1020，一年級' },
        { name: '普通物理B一', credit: 3, tag: 'tag.ee-dept', aliases: ['普通物理一'], note: 'PHYS1133，一年級' },
        { name: '普通物理B二', credit: 3, tag: 'tag.ee-dept', aliases: ['普通物理二'], note: 'PHYS1143，一年級' },
        { name: '普通物理實驗一', credit: 1, tag: 'tag.ee-dept', note: 'PHYS1010，一年級' },
        { name: '邏輯設計', credit: 3, tag: 'tag.ee-dept', note: 'EECS1010，一年級' },
        { name: '計算機程式設計', credit: 3, tag: 'tag.ee-dept', aliases: ['程式設計'], note: 'EE2310，一年級' },
        { name: '常微分方程', credit: 3, tag: 'tag.ee-dept', note: 'EECS2030，一年級' },
        { name: '偏微分方程與複變函數', credit: 3, tag: 'tag.ee-dept', note: 'EE2020，二年級（建議）' },
        { name: '線性代數', credit: 3, tag: 'tag.ee-dept', note: 'EE2030 或 EECS2050，二年級（建議）' },
        { name: '電路學', credit: 3, tag: 'tag.ee-dept', note: 'EE2210，二年級（建議）' },
        { name: '電子學一', credit: 3, tag: 'tag.ee-dept', note: 'EE2250，二年級（建議）' },
        { name: '電子學二', credit: 3, tag: 'tag.ee-dept', note: 'EE2260，三年級（建議）' },
        { name: '電磁學', credit: 3, tag: 'tag.ee-dept', note: 'EE2140，二年級（建議）' },
        { name: '訊號與系統', credit: 3, tag: 'tag.ee-dept', note: 'EECS2020，二年級（建議）' },
        { name: '機率', credit: 3, tag: 'tag.ee-dept', note: 'EE3060 或 EECS3030，二年級（建議）' },
        { name: '電子電路實驗', credit: 2, tag: 'tag.ee-dept', note: 'EE2245，三年級（建議）' },
        { name: '實作專題一', credit: 1, tag: 'tag.ee-dept', note: 'EE3900，三年級（建議）' },
        { name: '實作專題二', credit: 2, tag: 'tag.ee-dept', note: 'EE3910，四年級（建議）' },
      ],
    },
    {
      id: 'grp.ee-math',
      label: '數理必選（至少 3 學分）',
      note: '學分數為推估值，請依實際開課調整',
      rule: { type: 'atLeastCredits', n: 3 },
      defaultTag: 'tag.ee-math',
      items: [
        { name: '普通化學一', credit: 3, tag: 'tag.ee-math', note: 'CHEM1010' },
        { name: '普通化學二', credit: 3, tag: 'tag.ee-math', note: 'CHEM1020' },
        { name: '普通化學乙', credit: 3, tag: 'tag.ee-math', note: 'CHEM1000' },
        { name: '普通化學實驗一', credit: 1, tag: 'tag.ee-math', note: 'CHEM1030' },
        { name: '普通化學實驗二', credit: 1, tag: 'tag.ee-math', note: 'CHEM1040' },
        { name: '代數一', credit: 3, tag: 'tag.ee-math', note: 'MATH2410' },
        { name: '代數二', credit: 3, tag: 'tag.ee-math', note: 'MATH2420' },
        { name: '高等微積分一', credit: 3, tag: 'tag.ee-math', note: 'MATH2010' },
        { name: '高等微積分二', credit: 3, tag: 'tag.ee-math', note: 'MATH2020' },
        { name: '材料科學與工程一', credit: 3, tag: 'tag.ee-math', note: 'MS1021' },
        { name: '材料科學與工程二', credit: 3, tag: 'tag.ee-math', note: 'MS1022' },
        { name: '生命科學一', credit: 3, tag: 'tag.ee-math', note: 'LSC1101' },
        { name: '生命科學二', credit: 3, tag: 'tag.ee-math', note: 'LSC1102' },
        { name: '材料力學', credit: 3, tag: 'tag.ee-math', note: 'PME2350' },
        { name: '作業研究一', credit: 3, tag: 'tag.ee-math', note: 'IEEM3010' },
        { name: '普通物理實驗二', credit: 1, tag: 'tag.ee-math', note: 'PHYS1020' },
      ],
    },
    {
      id: 'grp.ee-lab',
      label: '必選實驗（至少三門）',
      rule: { type: 'atLeastCourses', n: 3 },
      defaultTag: 'tag.ee-lab',
      items: [
        { name: '邏輯設計實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE2230' },
        { name: '光電實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE4150' },
        { name: '電動機械實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE3840' },
        { name: '嵌入式系統與實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE2405' },
        { name: '固態電子實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE4320' },
        { name: '通訊系統實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE4650' },
        { name: '數位訊號處理實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE3662' },
        { name: '積體電路設計實驗', credit: 2, tag: 'tag.ee-lab', note: 'EE4292' },
      ],
    },
    {
      id: 'grp.zero',
      label: '零學分畢業條件',
      note: '不計學分，但未通過不得畢業',
      rule: { type: 'all' },
      items: [
        { name: '體育', credit: 0, note: '1 至 3 年級必修' },
        { name: '操行', credit: 0, note: '每學期成績及格' },
        { name: '學習護照', credit: 0, note: '須取得 12 點認證點數' },
      ],
    },
  ],
};
