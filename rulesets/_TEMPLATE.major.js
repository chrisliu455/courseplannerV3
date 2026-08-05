/**
 * rulesets/_TEMPLATE.major.js — 新增主修系所的範本
 *
 * 底線開頭代表這是範本，沒有註冊到 rulesets/index.js，不會出現在畫面上。
 *
 * ── 三個步驟 ────────────────────────────────────
 * 1. 複製這份，改名成 major.你的系.js（例：major.cs-114.js）
 * 2. 照下面的註解把內容換成你的系所規定
 * 3. 打開 rulesets/index.js，import 進來、加到 MAJORS 陣列
 *
 * 存檔重整就會出現在「主修」的單選清單裡。引擎和 UI 一行都不用改。
 *
 * ── 資料模型 ────────────────────────────────────
 *   標籤 tag       一門課掛一個，決定這門課的學分算到哪
 *   項目 bucket    學分判定的最小單位，可以吃 1 個以上的標籤
 *   大類 category  畫面上分區顯示的層級
 *
 * 一門課的學分只會算進一個領域。標籤設成什麼，學分就只去那裡。
 *
 * ── 數字要對得起來 ──────────────────────────────
 * 各大類的 minCredits 加總必須等於 totalCredits。
 * 算錯的話，判定結果最上方會跳出黃色警告，不會默默算錯。
 */

export default {
  /* ── 基本資料 ─────────────────────────────── */
  id: 'major.template', // 全域唯一，習慣用 major.系名-學年
  type: 'major',
  label: '範本學系', // 顯示在清單上的名稱
  short: '範本系',
  admissionYear: 114, // 選填，會顯示成「114 學年入學」
  totalCredits: 128, // 畢業總學分（= 下面各大類 minCredits 的加總）
  source: '114 學年度必修科目、學分數暨畢業總學分表',

  // 資料還沒核對完時填這兩個，畫面上會顯示提醒；核對完刪掉即可
  // dataStatus: 'unverified',
  // dataNote: '課程資料尚未與系辦公告核對',

  /* ── 修業選項 ─────────────────────────────────
   * 學生要自己選的東西（組別、學程⋯⋯）。沒有就寫 options: []
   * 選了之後，底下有 when 條件的規則才會生效。
   */
  options: [
    {
      id: 'group',
      label: '分組（二擇一）',
      choices: [
        { value: '', label: '— 尚未選擇 —' },
        { value: 'a', label: '甲組' },
        { value: 'b', label: '乙組' },
      ],
    },
  ],

  /* ── 標籤 ─────────────────────────────────────
   * 一門課掛一個。每個標籤一定要被下面某個 bucket 收走，
   * 否則掛這個標籤的課不會計入任何學分（健檢會警告）。
   */
  tags: [
    { id: 'tag.chinese', label: '大學中文', color: '#9C5B3C' },
    { id: 'tag.english', label: '英文領域', color: '#C08457' },
    { id: 'tag.ge-core', label: '核心通識', color: '#3B5170' },
    { id: 'tag.ge-general', label: '一般通識', color: '#6A7E9B' },
    { id: 'tag.dept', label: '系定必修', color: '#7A2E2E' },
    { id: 'tag.dept-elective', label: '系定選修', color: '#4A6FA1' },
    { id: 'tag.free-elective', label: '自由選修', color: '#B08D3F' },
  ],

  /* ── 學分判定：大類 → 項目 ────────────────────
   * 30 + 68 + 18 + 12 = 128，跟上面的 totalCredits 一致。
   */
  categories: [
    {
      id: 'cat.school',
      label: '校定必修',
      color: '#9C5B3C',
      minCredits: 30,
      buckets: [
        { id: 'bkt.chinese', label: '大學中文', tags: ['tag.chinese'], minCredits: 2 },
        { id: 'bkt.english', label: '英文領域', tags: ['tag.english'], minCredits: 8 },
        {
          id: 'bkt.ge',
          label: '通識',
          // 一個項目可以吃多個標籤：核心通識與一般通識一起湊 20 學分
          tags: ['tag.ge-core', 'tag.ge-general'],
          minCredits: 20,
          note: '顯示在項目名稱底下的小字說明',
          // 額外檢核：學分夠了還要滿足的條件
          checks: [{ type: 'minCoursesOfTag', tag: 'tag.ge-core', min: 4, label: '核心通識至少 4 門' }],
        },
      ],
    },
    {
      id: 'cat.dept',
      label: '系定必修',
      color: '#7A2E2E',
      minCredits: 68,
      buckets: [{ id: 'bkt.dept', label: '系定必修科目', tags: ['tag.dept'], minCredits: 68 }],
    },
    {
      id: 'cat.dept-elective',
      label: '系定選修',
      color: '#4A6FA1',
      minCredits: 18,
      buckets: [
        {
          id: 'bkt.dept-elective',
          label: '系定選修',
          tags: ['tag.dept-elective'],
          minCredits: 18,
          checks: [{ type: 'minCourses', min: 6, label: '至少修 6 門' }],
        },
      ],
    },
    {
      id: 'cat.free',
      label: '自由選修',
      color: '#B08D3F',
      minCredits: 12,
      buckets: [{ id: 'bkt.free', label: '自由選修', tags: ['tag.free-elective'], minCredits: 12 }],
    },
  ],

  /* ── 科目判定：規定要修的科目 ──────────────────
   * 排進學期就打勾。tag 欄位是「建議標籤」，從側欄匯入時會自動帶上。
   *
   * rule 有四種：
   *   { type:'all' }                  全部都要修（預設）
   *   { type:'atLeastCourses', n:2 }  至少修 n 門
   *   { type:'atLeastCredits', n:6 }  至少修滿 n 學分
   *   { type:'optional' }             只列出參考，不影響達標
   */
  subjectGroups: [
    {
      id: 'grp.school',
      label: '校定必修科目',
      rule: { type: 'all' },
      items: [
        { name: '大學中文', credit: 2, tag: 'tag.chinese' },
        { name: '英文一', credit: 2, tag: 'tag.english', note: '小字備註，會顯示在課名底下' },
        { name: '英文二', credit: 2, tag: 'tag.english' },
        { name: '英文三', credit: 2, tag: 'tag.english' },
        { name: '英文四', credit: 2, tag: 'tag.english' },
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
        // 課名有別稱時（例如課表寫「程式設計(一)」），加 aliases 一起比對
        { name: '程式設計一', credit: 3, tag: 'tag.dept', aliases: ['程式設計(一)', '計算機程式一'] },
      ],
    },
    {
      id: 'grp.pick',
      label: '指定選修（五選二）',
      rule: { type: 'atLeastCourses', n: 2 },
      defaultTag: 'tag.dept-elective',
      items: [
        { name: '課程甲', credit: 3, tag: 'tag.dept-elective' },
        { name: '課程乙', credit: 3, tag: 'tag.dept-elective' },
        { name: '課程丙', credit: 3, tag: 'tag.dept-elective' },
      ],
    },
    {
      // when：只有選了甲組才會出現這一組
      id: 'grp.group-a',
      label: '甲組必修',
      when: { option: 'group', equals: 'a' },
      rule: { type: 'all' },
      items: [{ name: '甲組專題', credit: 3, tag: 'tag.dept' }],
    },
    {
      // 巢狀群組：底下每個子群組都達標，這一組才算過
      id: 'grp.group-b',
      label: '乙組必修',
      when: { option: 'group', equals: 'b' },
      groups: [
        {
          id: 'grp.group-b.core',
          label: '核心課程（全部必修）',
          rule: { type: 'all' },
          items: [{ name: '乙組核心一', credit: 3, tag: 'tag.dept' }],
        },
        {
          id: 'grp.group-b.elec',
          label: '選修課程（2 門以上）',
          rule: { type: 'atLeastCourses', n: 2 },
          items: [
            { name: '乙組選修一', credit: 3, tag: 'tag.dept-elective' },
            { name: '乙組選修二', credit: 3, tag: 'tag.dept-elective' },
            { name: '乙組選修三', credit: 3, tag: 'tag.dept-elective' },
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
        { name: '體育', credit: 0 },
        { name: '操行', credit: 0 },
      ],
    },
  ],
};
