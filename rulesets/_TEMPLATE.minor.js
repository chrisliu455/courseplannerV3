/**
 * rulesets/_TEMPLATE.minor.js — 新增輔系／雙主修／學分學程的範本
 *
 * 底線開頭代表這是範本，沒有註冊，不會出現在畫面上。
 *
 * ── 三個步驟 ────────────────────────────────────
 * 1. 複製這份，改名成 minor.你的系.js（雙主修用 double.，學分學程用 program.）
 * 2. 照註解改內容
 * 3. 打開 rulesets/index.js，import 進來、加到 IDENTITIES 陣列
 *
 * 存檔重整就會出現在「額外身分」的勾選清單裡，可以複選。
 *
 * ── 跟主修模組的差別 ────────────────────────────
 * 額外身分模組只寫「額外」要求的部分，會疊加到主修上：
 *   totalCredits  這個身分額外要求的學分，會加到畢業總學分
 *                 （主修 129 ＋ 輔系 20 ＝ 149）
 *   tags          自己的標籤，標籤 id 要全域唯一
 *   categories    大類 id 用 'cat.identity'，多個身分會收在同一個「其他身分」底下
 *   subjectGroups 指定必修科目
 *
 * 如果貴校的規定是「這 20 學分可與主修互抵、總數不變」，
 * 把 totalCredits 設成 0 即可，項目本身的 20 學分門檻仍會照常檢核。
 */

export default {
  id: 'minor.template', // 全域唯一
  type: 'minor', // minor 輔系｜doubleMajor 雙主修｜program 學分學程
  label: '範本學系',
  short: '範本系',
  totalCredits: 20, // 額外要求的學分
  source: '範本學系輔系規定',

  // 標籤 id 建議帶上系名，避免兩個輔系撞在一起
  tags: [{ id: 'tag.minor-template', label: '輔系：範本系', color: '#5B4B8A' }],

  categories: [
    {
      id: 'cat.identity', // 固定用這個 id，才會跟其他身分合併在同一個大類
      label: '其他身分',
      color: '#5B4B8A',
      minCredits: 20,
      buckets: [
        {
          id: 'bkt.minor-template', // 全域唯一
          label: '輔系：範本學系',
          tags: ['tag.minor-template'],
          minCredits: 20,
          note: '須於主修最低學分之外，另加修至少 20 學分',
        },
      ],
    },
  ],

  subjectGroups: [
    {
      id: 'grp.minor.template',
      label: '範本系輔系指定科目',
      note: '下列科目須全部修畢',
      rule: { type: 'all' }, // 也可用 atLeastCourses / atLeastCredits
      defaultTag: 'tag.minor-template',
      items: [
        { name: '指定科目一', credit: 3, tag: 'tag.minor-template' },
        { name: '指定科目二', credit: 3, tag: 'tag.minor-template' },
        { name: '指定科目三', credit: 3, tag: 'tag.minor-template' },
      ],
    },
  ],
};
