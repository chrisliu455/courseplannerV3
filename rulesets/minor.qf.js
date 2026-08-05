/**
 * rulesets/minor.qf.js — 輔系：計量財務金融學系
 *
 * 這是一個「額外身分」模組。加進來之後：
 *   畢業總學分 ＋20（主修 129 → 149）
 *   多一個「輔系：計財系」標籤與項目
 *   多一組指定必修科目要打勾
 *
 * 依規定：除應滿足主學系規定最低學分外，應加修計財系規定之專業（門）必修科目
 * 至少 20 學分，且須修畢指定科目。
 */

export default {
  id: 'minor.qf',
  type: 'minor',
  label: '計量財務金融學系',
  short: '計財系',
  totalCredits: 20,
  source: '計量財務金融學系輔系規定',

  tags: [{ id: 'tag.minor-qf', label: '輔系：計財系', color: '#5B4B8A' }],

  categories: [
    {
      id: 'cat.identity',
      label: '其他身分',
      color: '#5B4B8A',
      minCredits: 20,
      buckets: [
        {
          id: 'bkt.minor-qf',
          label: '輔系：計量財務金融學系',
          tags: ['tag.minor-qf'],
          minCredits: 20,
          note: '須於主修最低學分之外，另加修至少 20 學分',
        },
      ],
    },
  ],

  subjectGroups: [
    {
      id: 'grp.minor.qf',
      label: '計財系輔系指定科目',
      note: '下列科目須全部修畢',
      rule: { type: 'all' },
      defaultTag: 'tag.minor-qf',
      items: [
        { name: '經濟學原理一', credit: 3, tag: 'tag.minor-qf' },
        { name: '經濟學原理二', credit: 3, tag: 'tag.minor-qf' },
        { name: '個體經濟學一', credit: 3, tag: 'tag.minor-qf' },
        { name: '財務管理', credit: 3, tag: 'tag.minor-qf' },
        { name: '衍生性金融市場', credit: 3, tag: 'tag.minor-qf' },
        { name: '統計學一', credit: 3, tag: 'tag.minor-qf' },
        { name: '統計學二', credit: 3, tag: 'tag.minor-qf' },
      ],
    },
  ],
};
