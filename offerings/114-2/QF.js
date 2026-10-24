/**
 * offerings/114-2/QF.js — 114 學年度第 2 學期・計財系（QF）開課資料
 *
 * 由 tools/extract-offerings.js 從「各系所必選修課程」查詢結果頁產生，請不要手改；
 * 資料有誤時重新查詢、重新產生。
 *
 * 抓取日期：2026-10-25。enrollment（修課人數）是當天的數字，之後會變動。
 * placeholder: true 的課（科號 YZ 開頭）只是提醒「到別系總錄選課」，不是真正的開課。
 *
 * 只收錄 EXTRACT_ONLY 指定的課名（共 29 個，見 only 欄位），其餘課程沒有收錄。
 */

export default {
  id: "offerings.114-2.QF",
  semester: "114-2", year: 114, term: 2,
  dept: "QF", deptName: "計財系", deptNameEn: "Department of Quantitative Finance",
  source: '清華大學校務資訊系統・各系所必選修課程',
  fetchedAt: "2026-10-25",

  /** 只收錄這些課名；沒有這個欄位＝全部收錄 */
  only: ["經濟學原理一","經濟學原理二","會計學一","會計學二","財務管理","管理學","法學緒論","民商法導論","科技法導論","微積分Ａ一","微積分Ａ二","統計學一","統計學二","個體經濟學一","總體經濟學一","高等微積分一","高等微積分二","衍生性金融市場","公司理財","國際財務管理","投資學","數理統計一","數理統計二","線性代數","計量經濟學一","個體經濟學二","總體經濟學二","計算機程式設計","資訊工程導論"],

  /** 這份資料涵蓋的班級課表 */
  classes: [
    { classCode: "QF 114B", label: "計財系一年級", grade: 1, section: null },
    { classCode: "QF 113B", label: "計財系二年級", grade: 2, section: null },
    { classCode: "QF 112B", label: "計財系三年級", grade: 3, section: null },
    { classCode: "QF 111B", label: "計財系畢業班", grade: 4, section: null },
  ],

  /** 同科號同時段只存一筆，出現在哪些班級課表記在 listings；同科號但時段不同會分成多筆 */
  courses: [
    {
      no: "ECON100201", name: "經濟學原理二", nameEn: "Principles of Economics (II)", credit: 3,
      time: "M7M8M9",
      meetings: [
        { slots: ["M7","M8","M9"], room: "COE教院105", capacity: 100 },
      ],
      teachers: ["余朝恩"],
      sizeLimit: 100, sizeNote: "", enrollment: 33,
      remarks: "【108(含)前入學生視為核心向度四】",
      restriction: "【上學期原修經濟學原理一ECON100101(余朝恩老師)同學選課優先,第3次選課起開放】",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100202", name: "經濟學原理二", nameEn: "Principles of Economics (II)", credit: 3,
      time: "R5R6R7",
      meetings: [
        { slots: ["R5","R6","R7"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["王惠貞"],
      sizeLimit: 115, sizeNote: "", enrollment: 102,
      remarks: "【108(含)前入學生視為核心向度四】",
      restriction: "【上學期原修經濟學原理一ECON100102(王惠貞老師)同學選課優先,第3次選課起開放】",
      object: "*3", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100203", name: "經濟學原理二", nameEn: "Principles of Economics (II)", credit: 3,
      time: "M7M8M9",
      meetings: [
        { slots: ["M7","M8","M9"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["趙相科"],
      sizeLimit: 103, sizeNote: "", enrollment: 101,
      remarks: "不接受加簽，【108(含)前入學生視為核心向度四】",
      restriction: "【上學期原修經濟學原理一ECON100103(李翎帆老師)同學選課優先,第3次選課起開放】",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: true, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100204", name: "經濟學原理二", nameEn: "Principles of Economics (II)", credit: 3,
      time: "F2F3F4",
      meetings: [
        { slots: ["F2","F3","F4"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["朱筱蕾"],
      sizeLimit: 102, sizeNote: "", enrollment: 99,
      remarks: "【108(含)前入學生視為核心向度四】",
      restriction: "【上學期原修經濟學原理一ECON100104(朱筱蕾老師)同學選課優先,第3次選課起開放】",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100205", name: "經濟學原理二", nameEn: "Principles of Economics (II)", credit: 3,
      time: "RnR5R6",
      meetings: [
        { slots: ["Rn","R5","R6"], room: "GEN IV綜四121", capacity: 190 },
      ],
      teachers: ["周瑞賢"],
      sizeLimit: 190, sizeNote: "", enrollment: 191,
      remarks: "【108(含)前入學生視為核心向度四】",
      restriction: "【上學期原修經濟學原理一ECON100105(周瑞賢老師)同學選課優先,第3次選課起開放】",
      object: "*3", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100206", name: "經濟學原理二", nameEn: "Principles of Economics (II)", credit: 3,
      time: "F7F8F9",
      meetings: [
        { slots: ["F7","F8","F9"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["唐震宏"],
      sizeLimit: 98, sizeNote: "", enrollment: 92,
      remarks: "【108(含)前入學生視為核心向度四】",
      restriction: "【上學期原修經濟學原理一ECON100106(唐震宏老師)同學選課優先,第3次選課起開放】",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100207", name: "經濟學原理二", nameEn: "Principles of Economics (II)", credit: 3,
      time: "FnF5F6",
      meetings: [
        { slots: ["Fn","F5","F6"], room: "GEN IV綜四121", capacity: 190 },
      ],
      teachers: ["周嗣文"],
      sizeLimit: 190, sizeNote: "", enrollment: 182,
      remarks: "【108(含)前入學生視為核心向度四】",
      restriction: "【上學期原修經濟學原理一ECON100107(周嗣文老師)同學選課優先,第3次選課起開放】",
      object: "*3", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "MATH102005", name: "微積分Ａ二", nameEn: "Calculus (II)", credit: 4,
      time: "M3M4W1W2",
      meetings: [
        { slots: ["M3","M4","W1","W2"], room: "GEN III綜三 201", capacity: 120 },
      ],
      teachers: ["黃明傑"],
      sizeLimit: 100, sizeNote: "", enrollment: 84,
      remarks: "演習課時間為W19:00-21:00，地點為台積203,204,309",
      restriction: "【上學期原修微積分Ａ一MATH101005(黃明傑老師)同學選課優先,第3次選課起開放】",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n微積分一-成績需D以上\n微積分Ａ一-成績需D以上\n微積分Ｂ一-成績需D以上\n微積分一(數學系)-成績需D以上\n曾修微積分一(數學系)(基本科目免修測試)\n曾修微積分Ａ一(基本科目免修測試)\n曾修微積分一(AP先修課程)\n上述條件任選一科，而且\n未修過微積分二(數學系)\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: true, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "QF 100300", name: "計算機程式設計", nameEn: "Introduction to Programming", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["陳政琦"],
      sizeLimit: 80, sizeNote: "", enrollment: 92,
      remarks: "",
      restriction: "限計財系大學部",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "QF 100501", name: "會計學二", nameEn: "Accounting (II)", credit: 3,
      time: "F6F7F8",
      meetings: [
        { slots: ["F6","F7","F8"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["潘虹華"],
      sizeLimit: 90, sizeNote: "", enrollment: 91,
      remarks: "",
      restriction: "【上學期原修會計學一QF 100401(潘虹華老師)同學選課優先,第3次選課起開放】",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n會計學一-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "QF 100502", name: "會計學二", nameEn: "Accounting (II)", credit: 3,
      time: "F5F6F7",
      meetings: [
        { slots: ["F5","F6","F7"], room: "TSMC台積203", capacity: 72 },
      ],
      teachers: ["黃海寧"],
      sizeLimit: 70, sizeNote: "", enrollment: 24,
      remarks: "",
      restriction: "【上學期原修會計學一QF 100402(黃海寧老師)同學選課優先,第3次選課起開放】",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n會計學一-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "QF 100503", name: "會計學二", nameEn: "Accounting (II)", credit: 3,
      time: "F6F7F8",
      meetings: [
        { slots: ["F6","F7","F8"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["張俊賢"],
      sizeLimit: 70, sizeNote: "", enrollment: 73,
      remarks: "",
      restriction: "【上學期原修會計學一QF 100403(張俊賢老師)同學選課優先,第3次選課起開放】",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n會計學一-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "LST 350400", name: "科技法導論", nameEn: "Introduction of Technology Law", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "LS II生二 109", capacity: 100 },
      ],
      teachers: ["高銘志"],
      sizeLimit: 90, sizeNote: "", enrollment: 59,
      remarks: "",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
        { classCode: "QF 112B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "LST 350402", name: "科技法導論", nameEn: "Introduction of Technology Law", credit: 3,
      time: "T5T6T7",
      meetings: [
        { slots: ["T5","T6","T7"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["李紀寬"],
      sizeLimit: 90, sizeNote: "", enrollment: 91,
      remarks: "",
      restriction: "",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
        { classCode: "QF 112B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214500", name: "統計學二", nameEn: "Statistics II", credit: 3,
      time: "M3M4W2",
      meetings: [
        { slots: ["M3","M4","W2"], room: "GEN IV綜四224", capacity: 190 },
      ],
      teachers: ["賴興國"],
      sizeLimit: 150, sizeNote: "", enrollment: 154,
      remarks: "",
      restriction: "【上學期原修統計學一QF 214401(余士迪老師)同學選課優先,第3次選課起開放】",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214601", name: "公司理財", nameEn: "Corporate Finance", credit: 3,
      time: "W7W8W9",
      meetings: [
        { slots: ["W7","W8","W9"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["黃德源"],
      sizeLimit: 80, sizeNote: "", enrollment: 59,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214602", name: "公司理財", nameEn: "Corporate Finance", credit: 3,
      time: "R6R7R8",
      meetings: [
        { slots: ["R6","R7","R8"], room: "TSMC台積204", capacity: 70 },
      ],
      teachers: ["謝佩芳"],
      sizeLimit: 65, sizeNote: "", enrollment: 73,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214603", name: "公司理財", nameEn: "Corporate Finance", credit: 3,
      time: "R6R7R8",
      meetings: [
        { slots: ["R6","R7","R8"], room: "TSMC台積206", capacity: 62 },
      ],
      teachers: ["蔡子晧"],
      sizeLimit: 60, sizeNote: "", enrollment: 42,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214900", name: "高等微積分一", nameEn: "Advanced Calculus I", credit: 3,
      time: "R1R2R3",
      meetings: [
        { slots: ["R1","R2","R3"], room: "GEN III綜三 203", capacity: 110 },
      ],
      teachers: ["陳柏揚"],
      sizeLimit: 100, sizeNote: "", enrollment: 63,
      remarks: "",
      restriction: "限計財系",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n微積分一-成績需C-以上\n微積分Ａ一-成績需C-以上\n微積分Ｂ一-成績需C-以上\n微積分一(數學系)-成績需C-以上\n曾修微積分一(數學系)(基本科目免修測試)\n曾修微積分Ａ一(基本科目免修測試)\n曾修微積分Ｂ一(基本科目免修測試)\n曾修微積分一(AP先修課程)\n上述條件任選一科，而且\n微積分二-成績需C-以上\n微積分Ｂ二-成績需C-以上\n微積分二(數學系)-成績需C-以上\n微積分Ａ二-成績需C-以上\n上述條件任選一科，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "TM 200201", name: "管理學", nameEn: "Management", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["胡美智"],
      sizeLimit: 50, sizeNote: "", enrollment: 59,
      remarks: "",
      restriction: "科管院,大學部2年級3年級4年級優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
        { classCode: "QF 112B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "TM 200202", name: "管理學", nameEn: "Management", credit: 3,
      time: "W7W8W9",
      meetings: [
        { slots: ["W7","W8","W9"], room: "TSMC台積223", capacity: 72 },
      ],
      teachers: ["李柏毅"],
      sizeLimit: 50, sizeNote: "", enrollment: 67,
      remarks: "",
      restriction: "科管院,大學部2年級3年級4年級優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 2, section: null, type: "required" },
        { classCode: "QF 112B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 414300", name: "國際財務管理", nameEn: "International Financial Management", credit: 3,
      time: "F5F6F7",
      meetings: [
        { slots: ["F5","F6","F7"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["曾祺峰"],
      sizeLimit: 85, sizeNote: "", enrollment: 83,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 111B", grade: 4, section: null, type: "optional" },
      ],
    },
  ],
};
