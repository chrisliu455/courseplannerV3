/**
 * rulesets/major.dongji-113.js — 主修：動機工程學系 113 學年入學
 *
 * 這份檔案只有資料，沒有邏輯。要新增別的系所，複製這一份改內容就好，
 * 引擎不用動一行。改完記得到 rulesets/index.js 註冊。
 *
 * 這是「主修」模組，只負責主修本身的 129 學分。
 * 輔系、雙主修、學分學程各自是獨立模組，加進來時學分要求會往上疊加。
 *
 * 結構：
 *   totalCredits  這個身分要求的學分
 *   tags          標籤，一門課掛一個
 *   categories    大類 → 項目 bucket → 每個 bucket 吃哪些標籤
 *   subjectGroups 科目判定：規定要修的科目清單
 *   options       修業選項（專業學程四擇一）
 */

export default {
  id: 'major.dongji-113',
  type: 'major',
  label: '動機工程學系',
  short: '動機系',
  admissionYear: 113,
  totalCredits: 129,
  source: '113 學年度動機系必修科目、學分數暨畢業總學分表',

  /* ── 選項：會影響哪些規則生效 ────────────────────── */
  options: [
    {
      id: 'track',
      label: '專業學程（四擇一）',
      choices: [
        { value: '', label: '— 尚未選擇 —' },
        { value: 'control', label: '電控學程' },
        { value: 'nano', label: '奈微米學程' },
        { value: 'energy', label: '能源學程' },
        { value: 'precision', label: '精密機械與智慧製造學程' },
      ],
    },
  ],

  /* ── 標籤 ──────────────────────────────────── */
  tags: [
    { id: 'tag.chinese', label: '大學中文', color: '#9C5B3C' },
    { id: 'tag.english', label: '英文領域', color: '#C08457' },
    { id: 'tag.ge-core', label: '核心通識', color: '#3B5170' },
    { id: 'tag.ge-general', label: '一般通識', color: '#6A7E9B' },
    { id: 'tag.dept', label: '系定必修', color: '#7A2E2E' },
    { id: 'tag.physics', label: '物理領域', color: '#9E4B45' },
    { id: 'tag.track', label: '專業學程', color: '#4A6FA1' },
    { id: 'tag.major-elective', label: '主修選修', color: '#B08D3F' },
  ],

  /* ── 五大類學分判定 ─────────────────────────────── */
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
          note: '通過本校英語能力檢定考試者，得免修選讀',
        },
        {
          id: 'bkt.ge',
          label: '通識',
          tags: ['tag.ge-core', 'tag.ge-general'],
          minCredits: 20,
          note: '核心通識 8–12 學分＋一般通識 8–12 學分',
          checks: [{ type: 'minCoursesOfTag', tag: 'tag.ge-core', min: 4, label: '核心通識至少 4 門' }],
        },
      ],
    },
    {
      id: 'cat.dept',
      label: '系定必修',
      color: '#7A2E2E',
      minCredits: 64,
      buckets: [
        { id: 'bkt.dept', label: '系定必修科目', tags: ['tag.dept'], minCredits: 58 },
        {
          id: 'bkt.physics',
          label: '物理領域',
          tags: ['tag.physics'],
          minCredits: 6,
          cap: 6,
          overflowTo: 'bkt.elective',
          note: '五選二，超修的學分自動改列其他選修',
          checks: [{ type: 'minCourses', min: 2, label: '至少修 2 門' }],
        },
      ],
    },
    {
      id: 'cat.track',
      label: '專業學程',
      color: '#4A6FA1',
      minCredits: 15,
      buckets: [
        {
          id: 'bkt.track',
          label: '專業學程',
          tags: ['tag.track'],
          minCredits: 15,
          cap: 15,
          overflowTo: 'bkt.elective',
          note: '須修 5 門以上：核心 3 門必選＋選修 2 門以上',
          checks: [{ type: 'minCourses', min: 5, label: '至少修 5 門' }],
        },
      ],
    },
    {
      id: 'cat.elective',
      label: '其他選修',
      color: '#B08D3F',
      minCredits: 20,
      buckets: [
        {
          id: 'bkt.elective',
          label: '主修選修',
          tags: ['tag.major-elective'],
          minCredits: 20,
          note: '其他項目超修溢出的學分也會落到這裡',
        },
      ],
    },
  ],

  /* ── 科目判定：規定要修的科目，排到就打勾 ────────── */
  subjectGroups: [
    {
      id: 'grp.school',
      label: '校定必修科目',
      rule: { type: 'all' },
      items: [
        { name: '大學中文', credit: 2, tag: 'tag.chinese' },
        { name: '英文一', credit: 2, tag: 'tag.english', note: '通過英語能力檢定者得免修' },
        { name: '英文二', credit: 2, tag: 'tag.english', note: '通過英語能力檢定者得免修' },
        { name: '英文三', credit: 2, tag: 'tag.english', note: '通過英語能力檢定者得免修' },
        { name: '英文四', credit: 2, tag: 'tag.english', note: '通過英語能力檢定者得免修' },
      ],
    },
    {
      id: 'grp.dept',
      label: '系定必修科目',
      rule: { type: 'all' },
      defaultTag: 'tag.dept',
      items: [
        { name: '微積分一', credit: 3, tag: 'tag.dept' },
        { name: '微積分二', credit: 3, tag: 'tag.dept' },
        { name: '工程數學一', credit: 3, tag: 'tag.dept' },
        { name: '工程數學二', credit: 3, tag: 'tag.dept' },
        { name: '基礎熱流學一', credit: 3, tag: 'tag.dept' },
        { name: '基礎熱流學二', credit: 3, tag: 'tag.dept' },
        { name: '應用力學一', credit: 2, tag: 'tag.dept' },
        { name: '應用力學二', credit: 2, tag: 'tag.dept' },
        { name: '專題研究一', credit: 1, tag: 'tag.dept' },
        { name: '專題研究二', credit: 2, tag: 'tag.dept' },
        { name: '固體力學與奈米材料實驗', credit: 1, tag: 'tag.dept' },
        { name: '熱流與動力系統實驗', credit: 1, tag: 'tag.dept' },
        { name: '普通化學乙', credit: 3, tag: 'tag.dept' },
        { name: '普通化學實驗', credit: 1, tag: 'tag.dept' },
        { name: '程式設計', credit: 3, tag: 'tag.dept' },
        { name: '工程導論', credit: 2, tag: 'tag.dept' },
        { name: '工程圖學', credit: 2, tag: 'tag.dept' },
        { name: '工場實習', credit: 1, tag: 'tag.dept' },
        { name: '電路學', credit: 3, tag: 'tag.dept' },
        { name: '電子學一', credit: 3, tag: 'tag.dept' },
        { name: '電子電路實驗一', credit: 1, tag: 'tag.dept' },
        { name: '材料力學', credit: 3, tag: 'tag.dept' },
        { name: '機械製造', credit: 3, tag: 'tag.dept' },
        { name: '機械設計', credit: 3, tag: 'tag.dept' },
        { name: '材料科學導論', credit: 3, tag: 'tag.dept' },
      ],
    },
    {
      id: 'grp.physics',
      label: '物理相關課程（五選二）',
      note: '工程光學、電磁學、近代物理導論為優先推薦',
      rule: { type: 'atLeastCourses', n: 2 },
      defaultTag: 'tag.physics',
      items: [
        { name: '工程光學', credit: 3, tag: 'tag.physics', note: '優先推薦' },
        { name: '電磁學', credit: 3, tag: 'tag.physics', note: '優先推薦' },
        { name: '近代物理導論', credit: 3, tag: 'tag.physics', note: '優先推薦' },
        { name: '普通物理一', credit: 3, tag: 'tag.physics' },
        { name: '普通物理二', credit: 3, tag: 'tag.physics' },
      ],
    },
    {
      id: 'grp.track.control',
      label: '電控學程',
      when: { option: 'track', equals: 'control' },
      defaultTag: 'tag.track',
      groups: [
        {
          id: 'grp.track.control.core',
          label: '核心課程（3 門必選）',
          rule: { type: 'all' },
          items: [
            { name: '控制系統一', credit: 3, tag: 'tag.track' },
            { name: '控制系統二', credit: 3, tag: 'tag.track' },
            { name: '電子學二', credit: 3, tag: 'tag.track' },
          ],
        },
        {
          id: 'grp.track.control.elec',
          label: '選修課程（2 門以上）',
          rule: { type: 'atLeastCourses', n: 2 },
          items: [
            { name: '微算機導論', credit: 3, tag: 'tag.track' },
            { name: '電動機械', credit: 3, tag: 'tag.track' },
            { name: '電磁學', credit: 3, tag: 'tag.track' },
            { name: '振動學', credit: 3, tag: 'tag.track' },
            { name: '系統動態分析', credit: 3, tag: 'tag.track' },
            { name: '邏輯設計與應用', credit: 3, tag: 'tag.track' },
            { name: '數值分析', credit: 3, tag: 'tag.track' },
            { name: '生醫微型系統晶片', credit: 3, tag: 'tag.track' },
            { name: '微機電系統導論', credit: 3, tag: 'tag.track' },
            { name: '工程光學', credit: 3, tag: 'tag.track' },
            { name: '線性系統理論', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '數位控制系統', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '非線性控制系統', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '機器人學', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '人工智慧導論', credit: 3, tag: 'tag.track', note: '研究所' },
          ],
        },
      ],
    },
    {
      id: 'grp.track.nano',
      label: '奈微米學程',
      when: { option: 'track', equals: 'nano' },
      defaultTag: 'tag.track',
      groups: [
        {
          id: 'grp.track.nano.core',
          label: '核心課程（3 門必選）',
          rule: { type: 'all' },
          items: [
            { name: '微機電系統導論', credit: 3, tag: 'tag.track' },
            { name: '奈米科技與應用', credit: 3, tag: 'tag.track' },
            { name: '振動學', credit: 3, tag: 'tag.track' },
          ],
        },
        {
          id: 'grp.track.nano.elec',
          label: '選修課程（2 門以上）',
          rule: { type: 'atLeastCourses', n: 2 },
          items: [
            { name: '微系統概論', credit: 3, tag: 'tag.track' },
            { name: '近代物理導論', credit: 3, tag: 'tag.track' },
            { name: '高等材料力學', credit: 3, tag: 'tag.track' },
            { name: '有限單元法導論', credit: 3, tag: 'tag.track' },
            { name: '光機電系統設計', credit: 3, tag: 'tag.track' },
            { name: '固體與奈微米力學導論', credit: 3, tag: 'tag.track' },
            { name: '微奈米製造技術', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '奈米結構力學', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '微系統設計', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '奈米工程', credit: 3, tag: 'tag.track', note: '研究所' },
          ],
        },
      ],
    },
    {
      id: 'grp.track.energy',
      label: '能源學程',
      when: { option: 'track', equals: 'energy' },
      defaultTag: 'tag.track',
      groups: [
        {
          id: 'grp.track.energy.core',
          label: '核心課程（3 門必選）',
          rule: { type: 'all' },
          items: [
            { name: '進階流體力學', credit: 3, tag: 'tag.track' },
            { name: '能源工程', credit: 3, tag: 'tag.track' },
            { name: '熱傳與質傳學', credit: 3, tag: 'tag.track' },
          ],
        },
        {
          id: 'grp.track.energy.elec',
          label: '選修課程（2 門以上）',
          rule: { type: 'atLeastCourses', n: 2 },
          items: [
            { name: '數值分析', credit: 3, tag: 'tag.track' },
            { name: '近代物理導論', credit: 3, tag: 'tag.track' },
            { name: '線性代數', credit: 3, tag: 'tag.track' },
            { name: '飛行力學', credit: 3, tag: 'tag.track' },
            { name: '燃燒學概論', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '熱對流', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '計算流體力學', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '氣體動力學', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '噴射推進', credit: 3, tag: 'tag.track', note: '研究所' },
          ],
        },
      ],
    },
    {
      id: 'grp.track.precision',
      label: '精密機械與智慧製造學程',
      when: { option: 'track', equals: 'precision' },
      defaultTag: 'tag.track',
      groups: [
        {
          id: 'grp.track.precision.core',
          label: '核心課程（3 門必選）',
          rule: { type: 'all' },
          items: [
            { name: '智慧製造導論', credit: 3, tag: 'tag.track' },
            { name: '光機電系統設計', credit: 3, tag: 'tag.track' },
            { name: '電腦輔助設計與製造', credit: 3, tag: 'tag.track' },
          ],
        },
        {
          id: 'grp.track.precision.elec',
          label: '選修課程（2 門以上）',
          rule: { type: 'atLeastCourses', n: 2 },
          items: [
            { name: '控制系統一', credit: 3, tag: 'tag.track' },
            { name: '工程光學', credit: 3, tag: 'tag.track' },
            { name: '振動學', credit: 3, tag: 'tag.track' },
            { name: '微機電系統導論', credit: 3, tag: 'tag.track' },
            { name: '有限單元法導論', credit: 3, tag: 'tag.track' },
            { name: '創新工程設計', credit: 3, tag: 'tag.track' },
            { name: '磁性元件概論', credit: 3, tag: 'tag.track' },
            { name: '精密機械設計一', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '精密機械設計二', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '製程診斷與分析', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '微奈米製造技術', credit: 3, tag: 'tag.track', note: '研究所' },
            { name: '光電子學', credit: 3, tag: 'tag.track', note: '研究所' },
          ],
        },
      ],
    },
    {
      id: 'grp.zero',
      label: '零學分必修',
      note: '不計學分，但未通過不得畢業',
      rule: { type: 'all' },
      items: [
        { name: '體育', credit: 0, note: '一～三年級必修' },
        { name: '操行', credit: 0, note: '每學期成績及格' },
      ],
    },
  ],
};
