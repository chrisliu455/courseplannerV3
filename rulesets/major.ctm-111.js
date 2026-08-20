/**
 * rulesets/major.ctm-111.js — 主修：科技管理學院學士班（111 學年度起入學適用）
 *
 * 這份規則集走的是「雙專長 → 管理學學士學位」這條路：
 * 第一專長在本院四個專長學程中選一個，第二專長在全校各系提供的第二專長學程中選一個
 * （目前只內建電機工程與資訊工程兩個，其他之後再加）。
 * 用學分學程取代第二專長的那條路，以及第一專長法律 → 法律學學士學位，這裡都沒做。
 *
 * 學分結構（固定 128）：
 *   校定必修 30 ＋ 基礎必修 21 ＋ 第一專長 35~36 ＋ 第二專長 27~33 ＋ 其餘選修 8~15
 *
 * 八種組合都剛好湊成 128：
 *   計財 35 ＋ 電機 33 ＋ 其餘選修  9
 *   計財 35 ＋ 資工 27 ＋ 其餘選修 15
 *   經濟／法律／管理 36 ＋ 電機 33 ＋ 其餘選修  8
 *   經濟／法律／管理 36 ＋ 資工 27 ＋ 其餘選修 14
 *
 * ── 官方表格對不上、我自己判斷的地方 ────────────────
 * 1. 四個第一專長的「必修＋選修」加起來，都剛好比表格標題的專長總學分多 1 學分
 *    （計財 26＋9＝35 vs 標題 34；經濟 33＋3＝36 vs 35；法律 25＋11＝36 vs 35；
 *      管理 15＋21＝36 vs 35）。四個專長都含「管理與科技專題 3 學分」，
 *    若那門課實際是 2 學分，四個數字就全部吻合，但表格四處都寫 3，所以沒有改。
 *    這裡以「必修＋選修的實際加總」為準（計財 35、其餘三個 36），科目清單照表格全列。
 *    畢業總學分維持 128 不動，多出來的 1 學分由**其餘選修**吸收。
 *    代價是其餘選修變成 8~15 學分，比修課地圖畫的 9~17 少 1；等系辦的答案回來再調。
 * 2. 二專電機的「計算機程式設計」在課程表裡是單獨一列、備註欄空白，
 *    沒有被併進下面「至少 6 學分」那一格，所以它是一定要修的必修課。
 *    3（計程）＋ 6（線代／常微分／機率三選二）＋ 12（電機六選四）
 *    ＋ 2（實驗）＋ 10（專業選修）＝ 33，與課程表的總學分完全吻合。
 * 3. 英文領域 8 學分沒有列出具體科目，所以只做學分判定，科目判定不列科目。
 * 4. 核心通識拆成向度一～向度四四個標籤，修課時要自己選對向度，
 *    引擎才判定得出「四個不同向度各至少一門」。
 * 5. 經濟專長選修「經濟學系科號 ECON2 以上課程」沒有具體清單，只做學分判定。
 *    二專電機的實驗課程與專業選修課程同理。
 * 6. 經濟專長的「4 套選 1 套」規定是要修完同一套的一、二兩門，
 *    引擎只能檢核「至少 6 學分」，不會檢查你有沒有把一、二湊成一套。
 */

/**
 * 其餘選修的學分＝128 減掉前面所有大類，所以第一專長與第二專長各選什麼，
 * 這裡就有四種數字。四個大類互斥（when 同時比對兩個選項），
 * 共用同一個「其餘選修」標籤，只有選到的那一組會生效。
 *
 * 回傳陣列是為了在 categories 裡用 ...（展開運算子）攤平成一個大類。
 */
function electiveCategory(key, credits, when) {
  return [
    {
      id: `cat.elective-${key}`,
      label: '其餘選修',
      color: '#B08D3F',
      minCredits: credits,
      note: '全校課程任選，建議先選修各專長學程之先修、擋修課程，亦可修習專長領域之進階課程',
      when: { allOf: when },
      buckets: [
        { id: `bkt.elective-${key}`, label: '其餘選修', tags: ['tag.elective'], minCredits: credits },
      ],
    },
  ];
}

export default {
  id: 'major.ctm-111',
  type: 'major',
  label: '科技管理學院學士班',
  short: '科管院學士班',
  admissionYear: 111,
  totalCredits: 128,
  source: '科管院學士班畢業總學分表（111 學年度起入學適用）＋ 115 學年度第二專長學程課程表',
  dataNote:
    '請先在下方選擇第一專長與第二專長，兩個都選了才算得出專長與其餘選修的學分。' +
    '第一專長的學分門檻採課程表「必修＋選修」的實際加總（計財 35、其餘 36），' +
    '比院方公告的專長總學分多 1 學分，差額由其餘選修吸收',

  /* ── 選項：兩個專長都要選，選了才算得出學分 ──────────── */
  options: [
    {
      id: 'major1',
      label: '第一專長（四擇一）',
      choices: [
        { value: '', label: '— 尚未選擇 —' },
        { value: 'qf', label: '計量財務金融專長學程' },
        { value: 'econ', label: '經濟專長學程' },
        { value: 'law', label: '法律專長學程' },
        { value: 'mgmt', label: '管理專長學程' },
      ],
    },
    {
      id: 'major2',
      label: '第二專長（擇一）',
      choices: [
        { value: '', label: '— 尚未選擇 —' },
        { value: 'ee', label: '電機工程' },
        { value: 'cs', label: '資訊工程' },
      ],
    },
  ],

  /* ── 標籤 ──────────────────────────────────
   * 第一專長四擇一是互斥的，四個專長共用「第一專長必修／選修」兩個標籤，
   * 不必為每個專長各做一組，加課時的選單才不會爆炸。
   */
  tags: [
    { id: 'tag.chinese', label: '大學中文', color: '#9C5B3C' },
    { id: 'tag.english', label: '英文領域', color: '#C08457' },
    { id: 'tag.ge-core-1', label: '核心通識・向度一', color: '#2F4858' },
    { id: 'tag.ge-core-2', label: '核心通識・向度二', color: '#3B5170' },
    { id: 'tag.ge-core-3', label: '核心通識・向度三', color: '#4E6E93' },
    { id: 'tag.ge-core-4', label: '核心通識・向度四', color: '#6389B5' },
    { id: 'tag.ge-general', label: '一般通識', color: '#8A94A8' },
    { id: 'tag.foundation', label: '基礎必修', color: '#7A2E2E' },
    { id: 'tag.m1-req', label: '第一專長必修', color: '#4A6FA1' },
    { id: 'tag.m1-elec', label: '第一專長選修', color: '#6389B5' },
    { id: 'tag.m2-ee-prog', label: '二專電機・計算機程式設計', color: '#1F5C59' },
    { id: 'tag.m2-ee-math', label: '二專電機・數理必修', color: '#2F6F6C' },
    { id: 'tag.m2-ee-core', label: '二專電機・電機必修', color: '#3D8A86' },
    { id: 'tag.m2-ee-lab', label: '二專電機・實驗', color: '#55A29E' },
    { id: 'tag.m2-ee-pro', label: '二專電機・專業選修', color: '#7CB8B5' },
    { id: 'tag.m2-cs-req', label: '二專資工・必修', color: '#2F6F6C' },
    { id: 'tag.elective', label: '其餘選修', color: '#B08D3F' },
  ],

  /* ── 學分判定 ─────────────────────────────── */
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
          note: '通過本校訂定之英語能力檢定考試者，得免修選讀英文 2 學分',
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
      id: 'cat.foundation',
      label: '基礎必修',
      color: '#7A2E2E',
      minCredits: 21,
      buckets: [{ id: 'bkt.foundation', label: '基礎必修科目', tags: ['tag.foundation'], minCredits: 21 }],
    },

    /* 第一專長：四個互斥的大類，只有選到的那個會生效 */
    {
      id: 'cat.m1-qf',
      label: '第一專長：計量財務金融',
      color: '#4A6FA1',
      minCredits: 35,
      when: { option: 'major1', equals: 'qf' },
      buckets: [
        { id: 'bkt.m1-qf-req', label: '計財專長必修', tags: ['tag.m1-req'], minCredits: 26 },
        {
          id: 'bkt.m1-qf-elec',
          label: '計財專長選修',
          tags: ['tag.m1-elec'],
          minCredits: 9,
        },
      ],
    },
    {
      id: 'cat.m1-econ',
      label: '第一專長：經濟',
      color: '#4A6FA1',
      minCredits: 36,
      when: { option: 'major1', equals: 'econ' },
      buckets: [
        { id: 'bkt.m1-econ-req', label: '經濟專長必修', tags: ['tag.m1-req'], minCredits: 33 },
        {
          id: 'bkt.m1-econ-elec',
          label: '經濟專長選修',
          tags: ['tag.m1-elec'],
          minCredits: 3,
          note: '經濟學系科號 ECON2 以上課程',
        },
      ],
    },
    {
      id: 'cat.m1-law',
      label: '第一專長：法律',
      color: '#4A6FA1',
      minCredits: 36,
      when: { option: 'major1', equals: 'law' },
      buckets: [
        { id: 'bkt.m1-law-req', label: '法律專長必修', tags: ['tag.m1-req'], minCredits: 25 },
        {
          id: 'bkt.m1-law-elec',
          label: '法律專長選修',
          tags: ['tag.m1-elec'],
          minCredits: 11,
        },
      ],
    },
    {
      id: 'cat.m1-mgmt',
      label: '第一專長：管理',
      color: '#4A6FA1',
      minCredits: 36,
      when: { option: 'major1', equals: 'mgmt' },
      buckets: [
        { id: 'bkt.m1-mgmt-req', label: '管理專長必修', tags: ['tag.m1-req'], minCredits: 15 },
        {
          id: 'bkt.m1-mgmt-elec',
          label: '管理專長選修',
          tags: ['tag.m1-elec'],
          minCredits: 21,
        },
      ],
    },

    /* 第二專長：兩個互斥的大類 */
    {
      id: 'cat.m2-ee',
      label: '第二專長：電機工程',
      color: '#2F6F6C',
      minCredits: 33,
      when: { option: 'major2', equals: 'ee' },
      buckets: [
        {
          id: 'bkt.m2-ee-prog',
          label: '計算機程式設計',
          tags: ['tag.m2-ee-prog'],
          minCredits: 3,
          note: '課程表裡單獨一列、備註欄空白，是一定要修的必修課',
        },
        {
          id: 'bkt.m2-ee-math',
          label: '數理必修（至少 6 學分）',
          tags: ['tag.m2-ee-math'],
          minCredits: 6,
          note: '線性代數／常微分方程／機率，三門中至少修 6 學分',
        },
        {
          id: 'bkt.m2-ee-core',
          label: '電機必修（至少 12 學分）',
          tags: ['tag.m2-ee-core'],
          minCredits: 12,
          note: '邏輯設計／電路學／電子學一、二／電磁學／訊號與系統，六門中至少修 12 學分',
        },
        {
          id: 'bkt.m2-ee-lab',
          label: '電機系實驗課程',
          tags: ['tag.m2-ee-lab'],
          minCredits: 2,
          note: '至少一門、至多兩門（每門 2 學分）',
        },
        {
          id: 'bkt.m2-ee-pro',
          label: '電機系專業選修',
          tags: ['tag.m2-ee-pro'],
          minCredits: 10,
          note: '至少 10 學分，排除電機系必修課及專題研究',
        },
      ],
    },
    {
      id: 'cat.m2-cs',
      label: '第二專長：資訊工程',
      color: '#2F6F6C',
      minCredits: 27,
      when: { option: 'major2', equals: 'cs' },
      buckets: [
        {
          id: 'bkt.m2-cs-req',
          label: '二專資工必修（9 門）',
          tags: ['tag.m2-cs-req'],
          minCredits: 27,
          note: '普通物理 B、微積分 B 僅為建議先修，不列入本學程學分',
        },
      ],
    },

    /* 其餘選修：學分是「128 減掉前面全部」，所以四種組合各有各的數字。
     * 做成四個互斥的大類，畫面上只會出現選到的那一個
     * （未啟用的大類整個不顯示，未啟用的「項目」才會留一列灰的）。 */
    ...electiveCategory('qf-ee', 9, [
      { option: 'major1', equals: 'qf' },
      { option: 'major2', equals: 'ee' },
    ]),
    ...electiveCategory('qf-cs', 15, [
      { option: 'major1', equals: 'qf' },
      { option: 'major2', equals: 'cs' },
    ]),
    ...electiveCategory('other-ee', 8, [
      { option: 'major1', in: ['econ', 'law', 'mgmt'] },
      { option: 'major2', equals: 'ee' },
    ]),
    ...electiveCategory('other-cs', 14, [
      { option: 'major1', in: ['econ', 'law', 'mgmt'] },
      { option: 'major2', equals: 'cs' },
    ]),
  ],

  /* ── 科目判定 ─────────────────────────────── */
  subjectGroups: [
    {
      id: 'grp.school',
      label: '校定必修科目',
      note: '英文領域 8 學分未列具體科目，僅做學分判定',
      rule: { type: 'all' },
      items: [{ name: '大學中文', credit: 2, tag: 'tag.chinese' }],
    },

    {
      id: 'grp.foundation',
      label: '基礎必修（21 學分，全部必修）',
      rule: { type: 'all' },
      defaultTag: 'tag.foundation',
      items: [
        { name: '經濟學原理一', credit: 3, tag: 'tag.foundation' },
        { name: '經濟學原理二', credit: 3, tag: 'tag.foundation' },
        { name: '會計學一', credit: 3, tag: 'tag.foundation' },
        { name: '會計學二', credit: 3, tag: 'tag.foundation' },
        { name: '財務管理', credit: 3, tag: 'tag.foundation' },
        { name: '管理學', credit: 3, tag: 'tag.foundation' },
        { name: '法學緒論', credit: 3, tag: 'tag.foundation' },
      ],
    },

    /* ── 第一專長：計量財務金融 ── */
    {
      id: 'grp.m1.qf',
      label: '第一專長：計量財務金融專長學程（34 學分）',
      note: '第二專長修習經濟學程者，個體與總體經濟學課程需修習 QF 其他課程補足學分',
      when: { option: 'major1', equals: 'qf' },
      groups: [
        {
          id: 'grp.m1.qf.req',
          label: '必修 26 學分（全部修畢）',
          rule: { type: 'all' },
          defaultTag: 'tag.m1-req',
          items: [
            { name: '微積分A一', credit: 4, tag: 'tag.m1-req' },
            { name: '微積分A二', credit: 4, tag: 'tag.m1-req' },
            { name: '統計學一', credit: 3, tag: 'tag.m1-req' },
            { name: '統計學二', credit: 3, tag: 'tag.m1-req' },
            { name: '管理與科技專題', credit: 3, tag: 'tag.m1-req' },
            { name: '個體經濟學一', credit: 3, tag: 'tag.m1-req' },
            { name: '總體經濟學一', credit: 3, tag: 'tag.m1-req' },
            { name: '衍生性金融市場', credit: 3, tag: 'tag.m1-req' },
          ],
        },
        {
          id: 'grp.m1.qf.elec',
          label: '選修（至少 9 學分）',
          rule: { type: 'atLeastCredits', n: 9 },
          defaultTag: 'tag.m1-elec',
          items: [
            { name: '數理統計一', credit: 3, tag: 'tag.m1-elec' },
            { name: '數理統計二', credit: 3, tag: 'tag.m1-elec' },
            { name: '公司理財', credit: 3, tag: 'tag.m1-elec' },
            { name: '國際財務管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '投資學', credit: 3, tag: 'tag.m1-elec' },
            { name: '個體經濟學二', credit: 3, tag: 'tag.m1-elec' },
            { name: '總體經濟學二', credit: 3, tag: 'tag.m1-elec' },
            { name: '高等微積分一', credit: 3, tag: 'tag.m1-elec' },
            { name: '高等微積分二', credit: 3, tag: 'tag.m1-elec' },
            { name: '線性代數', credit: 3, tag: 'tag.m1-elec' },
          ],
        },
      ],
    },

    /* ── 第一專長：經濟 ── */
    {
      id: 'grp.m1.econ',
      label: '第一專長：經濟專長學程（35 學分）',
      when: { option: 'major1', equals: 'econ' },
      groups: [
        {
          id: 'grp.m1.econ.req',
          label: '必修 27 學分（全部修畢）',
          rule: { type: 'all' },
          defaultTag: 'tag.m1-req',
          items: [
            { name: '微積分B一', credit: 3, tag: 'tag.m1-req' },
            { name: '微積分B二', credit: 3, tag: 'tag.m1-req' },
            { name: '統計學一', credit: 3, tag: 'tag.m1-req' },
            { name: '統計學二', credit: 3, tag: 'tag.m1-req' },
            { name: '管理與科技專題', credit: 3, tag: 'tag.m1-req' },
            { name: '個體經濟學一', credit: 3, tag: 'tag.m1-req' },
            { name: '個體經濟學二', credit: 3, tag: 'tag.m1-req' },
            { name: '總體經濟學一', credit: 3, tag: 'tag.m1-req' },
            { name: '總體經濟學二', credit: 3, tag: 'tag.m1-req' },
          ],
        },
        {
          id: 'grp.m1.econ.set',
          label: '4 套選 1 套（6 學分，同一套的一、二都要修）',
          note: '引擎只檢核學分數，不會檢查你有沒有把一、二湊成同一套',
          rule: { type: 'atLeastCredits', n: 6 },
          defaultTag: 'tag.m1-req',
          items: [
            { name: '國際經濟學一', credit: 3, tag: 'tag.m1-req' },
            { name: '國際經濟學二', credit: 3, tag: 'tag.m1-req' },
            { name: '財政學一', credit: 3, tag: 'tag.m1-req' },
            { name: '財政學二', credit: 3, tag: 'tag.m1-req' },
            { name: '貨幣銀行學一', credit: 3, tag: 'tag.m1-req' },
            { name: '貨幣銀行學二', credit: 3, tag: 'tag.m1-req' },
            { name: '計量經濟學一', credit: 3, tag: 'tag.m1-req' },
            { name: '計量經濟學二', credit: 3, tag: 'tag.m1-req' },
          ],
        },
      ],
    },

    /* ── 第一專長：法律 ── */
    {
      id: 'grp.m1.law',
      label: '第一專長：法律專長學程（35 學分）',
      when: { option: 'major1', equals: 'law' },
      groups: [
        {
          id: 'grp.m1.law.req',
          label: '必修 25 學分（全部修畢）',
          rule: { type: 'all' },
          defaultTag: 'tag.m1-req',
          items: [
            { name: '管理與科技專題', credit: 3, tag: 'tag.m1-req' },
            { name: '憲法一', credit: 2, tag: 'tag.m1-req' },
            { name: '憲法二', credit: 2, tag: 'tag.m1-req' },
            { name: '民法總則', credit: 4, tag: 'tag.m1-req' },
            { name: '民法債編一', credit: 3, tag: 'tag.m1-req' },
            { name: '民法物權', credit: 3, tag: 'tag.m1-req' },
            { name: '親屬繼承', credit: 2, tag: 'tag.m1-req' },
            { name: '刑法總則', credit: 3, tag: 'tag.m1-req' },
            { name: '刑法分則', credit: 3, tag: 'tag.m1-req' },
          ],
        },
        {
          id: 'grp.m1.law.elec',
          label: '選修（至少 11 學分）',
          rule: { type: 'atLeastCredits', n: 11 },
          defaultTag: 'tag.m1-elec',
          items: [
            { name: '民法債編二', credit: 3, tag: 'tag.m1-elec' },
            { name: '商事法一', credit: 2, tag: 'tag.m1-elec' },
            { name: '商事法二', credit: 2, tag: 'tag.m1-elec' },
            { name: '行政法一', credit: 3, tag: 'tag.m1-elec' },
            { name: '行政法二', credit: 3, tag: 'tag.m1-elec' },
            { name: '國際公法', credit: 3, tag: 'tag.m1-elec' },
            { name: '國際私法', credit: 2, tag: 'tag.m1-elec' },
            { name: '民事訴訟法一', credit: 3, tag: 'tag.m1-elec' },
            { name: '民事訴訟法二', credit: 3, tag: 'tag.m1-elec' },
            { name: '刑事訴訟法一', credit: 2, tag: 'tag.m1-elec' },
            { name: '刑事訴訟法二', credit: 2, tag: 'tag.m1-elec' },
          ],
        },
      ],
    },

    /* ── 第一專長：管理 ── */
    {
      id: 'grp.m1.mgmt',
      label: '第一專長：管理專長學程（35 學分）',
      when: { option: 'major1', equals: 'mgmt' },
      groups: [
        {
          id: 'grp.m1.mgmt.req',
          label: '必修 15 學分（全部修畢）',
          rule: { type: 'all' },
          defaultTag: 'tag.m1-req',
          items: [
            { name: '微積分B一', credit: 3, tag: 'tag.m1-req' },
            { name: '微積分B二', credit: 3, tag: 'tag.m1-req' },
            { name: '統計學一', credit: 3, tag: 'tag.m1-req' },
            { name: '統計學二', credit: 3, tag: 'tag.m1-req' },
            { name: '管理與科技專題', credit: 3, tag: 'tag.m1-req' },
          ],
        },
        {
          id: 'grp.m1.mgmt.elec',
          label: '選修（至少 21 學分）',
          rule: { type: 'atLeastCredits', n: 21 },
          defaultTag: 'tag.m1-elec',
          items: [
            { name: '科技管理導論', credit: 3, tag: 'tag.m1-elec' },
            { name: '資訊管理導論', credit: 3, tag: 'tag.m1-elec' },
            { name: '程式設計與商業分析', credit: 3, tag: 'tag.m1-elec' },
            { name: '數位創新與電子商務', credit: 3, tag: 'tag.m1-elec' },
            { name: '電子商務與零售管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '計算統計在資料科學之應用', credit: 3, tag: 'tag.m1-elec' },
            { name: '多感官人機互動：探索未來設計的可能性', credit: 3, tag: 'tag.m1-elec' },
            { name: '組織行為', credit: 3, tag: 'tag.m1-elec' },
            { name: '人力資源管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '行銷管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '國際企業管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '前線服務人員管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '企業倫理與社會責任', credit: 3, tag: 'tag.m1-elec' },
            { name: '物流與供應鏈管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '智慧財產權管理', credit: 3, tag: 'tag.m1-elec' },
            { name: '能源轉型與產業發展', credit: 3, tag: 'tag.m1-elec' },
            { name: '資訊管理系統', credit: 3, tag: 'tag.m1-elec' },
            { name: '資訊服務理論與實務', credit: 3, tag: 'tag.m1-elec' },
          ],
        },
      ],
    },

    /* ── 第二專長：電機工程（33 學分）── */
    {
      id: 'grp.m2.ee',
      label: '第二專長：電機工程（33 學分）',
      note: '實驗課程與專業選修課程沒有指定科目清單，只做學分判定',
      when: { option: 'major2', equals: 'ee' },
      groups: [
        {
          id: 'grp.m2.ee.prog',
          label: '必修・計算機程式設計（一定要修）',
          rule: { type: 'all' },
          defaultTag: 'tag.m2-ee-prog',
          items: [
            {
              name: '計算機程式設計',
              credit: 3,
              tag: 'tag.m2-ee-prog',
              note: '認列：EECS1111／CS1355／CS1356／ESS2020／IEEM1010／PME1018',
            },
          ],
        },
        {
          id: 'grp.m2.ee.math',
          label: '必修・數理（三門中至少 6 學分）',
          rule: { type: 'atLeastCredits', n: 6 },
          defaultTag: 'tag.m2-ee-math',
          items: [
            {
              name: '線性代數',
              credit: 3,
              tag: 'tag.m2-ee-math',
              note: '認列：EECS2050／CS2334／IEEM2010／PME3007／MATH1420',
            },
            {
              name: '常微分方程',
              credit: 3,
              tag: 'tag.m2-ee-math',
              note: '認列：CHE2110／ESS2030／MS2011／PME2001／BMES2111',
            },
            {
              name: '機率',
              credit: 3,
              tag: 'tag.m2-ee-math',
              note: '認列：MATH2810／CS3332／IEEM2030／BMES2121／ESS3040',
            },
          ],
        },
        {
          id: 'grp.m2.ee.core',
          label: '必修・電機（六門中至少 12 學分）',
          rule: { type: 'atLeastCredits', n: 12 },
          defaultTag: 'tag.m2-ee-core',
          items: [
            { name: '邏輯設計', credit: 3, tag: 'tag.m2-ee-core', note: '認列：PME3209／CSR1002' },
            { name: '電路學', credit: 3, tag: 'tag.m2-ee-core', note: '認列：ESS2200／PME2201／CSR2002' },
            { name: '電子學一', credit: 3, tag: 'tag.m2-ee-core', note: '認列：ESS2230／MS2072／PHYS3090／CSR2005' },
            { name: '電子學二', credit: 3, tag: 'tag.m2-ee-core', note: '認列：ESS2250／BMES2232／PME3202／CSR2006' },
            {
              name: '電磁學',
              credit: 3,
              tag: 'tag.m2-ee-core',
              note: '認列：PHYS2310／ESS2330／BMES2242／PME3212／MS4061',
            },
            { name: '訊號與系統', credit: 3, tag: 'tag.m2-ee-core', note: '認列：ESS3280／BMES4421' },
          ],
        },
      ],
    },

    /* ── 第二專長：資訊工程（27 學分）── */
    {
      id: 'grp.m2.cs',
      label: '第二專長：資訊工程（27 學分）',
      when: { option: 'major2', equals: 'cs' },
      groups: [
        {
          id: 'grp.m2.cs.req',
          label: '必修 27 學分（九門全部修畢）',
          rule: { type: 'all' },
          defaultTag: 'tag.m2-cs-req',
          items: [
            {
              name: '計算機程式設計一',
              credit: 3,
              tag: 'tag.m2-cs-req',
              note: '認列：EE2310／EECS1111／ESS2020／IEEM1010／PME1018／JITA1108',
            },
            { name: '計算機程式設計二', credit: 3, tag: 'tag.m2-cs-req' },
            { name: '資料結構', credit: 3, tag: 'tag.m2-cs-req', note: '認列：EECS2040／EE2410／IEEM3140' },
            {
              name: '線性代數',
              credit: 3,
              tag: 'tag.m2-cs-req',
              note: '認列：EECS2050／MATH1410／MATH1420／QF2148／EE2030／IEEM2010／PME3007',
            },
            {
              name: '離散數學',
              credit: 3,
              tag: 'tag.m2-cs-req',
              note: '認列：EECS2060／EE2060／MATH2870／IEEM2021',
            },
            { name: '邏輯設計', credit: 3, tag: 'tag.m2-cs-req' },
            { name: '計算機結構', credit: 3, tag: 'tag.m2-cs-req', note: '認列：EECS4030／EE3450' },
            { name: '計算方法設計', credit: 3, tag: 'tag.m2-cs-req', note: '認列：EE3980／EECS4020' },
            { name: '作業系統', credit: 3, tag: 'tag.m2-cs-req' },
          ],
        },
        {
          id: 'grp.m2.cs.pre',
          label: '基礎先修（建議修習，不列入第二專長學分）',
          note: '修了的話學分算在其餘選修',
          rule: { type: 'optional' },
          defaultTag: 'tag.elective',
          items: [
            { name: '普通物理B一', credit: 3, tag: 'tag.elective' },
            { name: '普通物理B二', credit: 3, tag: 'tag.elective' },
            { name: '微積分B一', credit: 3, tag: 'tag.elective' },
            { name: '微積分B二', credit: 3, tag: 'tag.elective' },
          ],
        },
      ],
    },

    {
      id: 'grp.zero',
      label: '零學分畢業條件',
      note: '不計學分，但未通過不得畢業',
      rule: { type: 'all' },
      items: [
        { name: '體育', credit: 0, note: '1 至 3 年級必修，含大一體育共須修滿 6 次' },
        { name: '操行', credit: 0, note: '每學期成績及格' },
      ],
    },
  ],
};
