/**
 * offerings/115-1/QF.js — 115 學年度第 1 學期・計財系（QF）開課資料
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
  id: "offerings.115-1.QF",
  semester: "115-1", year: 115, term: 1,
  dept: "QF", deptName: "計財系", deptNameEn: "Department of Quantitative Finance",
  source: '清華大學校務資訊系統・各系所必選修課程',
  fetchedAt: "2026-10-25",

  /** 只收錄這些課名；沒有這個欄位＝全部收錄 */
  only: ["經濟學原理一","經濟學原理二","會計學一","會計學二","財務管理","管理學","法學緒論","民商法導論","科技法導論","微積分Ａ一","微積分Ａ二","統計學一","統計學二","個體經濟學一","總體經濟學一","高等微積分一","高等微積分二","衍生性金融市場","公司理財","國際財務管理","投資學","數理統計一","數理統計二","線性代數","計量經濟學一","個體經濟學二","總體經濟學二","計算機程式設計","資訊工程導論"],

  /** 這份資料涵蓋的班級課表 */
  classes: [
    { classCode: "QF 115B", label: "計財系一年級", grade: 1, section: null },
    { classCode: "QF 114B", label: "計財系二年級", grade: 2, section: null },
    { classCode: "QF 113B", label: "計財系三年級", grade: 3, section: null },
    { classCode: "QF 112B", label: "計財系四年級", grade: 4, section: null },
  ],

  /** 同科號同時段只存一筆，出現在哪些班級課表記在 listings；同科號但時段不同會分成多筆 */
  courses: [
    {
      no: "ECON100101", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "M7M8M9",
      meetings: [
        { slots: ["M7","M8","M9"], room: "PHYS物 019", capacity: 129 },
      ],
      teachers: ["余朝恩"],
      sizeLimit: 100, sizeNote: "新生保留75人", enrollment: 88,
      remarks: "HSS政治經濟學程必修",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100102", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "R5R6R7",
      meetings: [
        { slots: ["R5","R6","R7"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["王惠貞"],
      sizeLimit: 110, sizeNote: "新生保留110人", enrollment: 111,
      remarks: "HSS政治經濟學程必修",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100103", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "M7M8M9",
      meetings: [
        { slots: ["M7","M8","M9"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["李翎帆"],
      sizeLimit: 50, sizeNote: "", enrollment: 102,
      remarks: "HSS政治經濟學程必修、下學期由趙相科老師授課",
      restriction: "科管院,工工系優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100104", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "F2F3F4",
      meetings: [
        { slots: ["F2","F3","F4"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["朱筱蕾"],
      sizeLimit: 94, sizeNote: "新生保留94人", enrollment: 111,
      remarks: "HSS政治經濟學程必修",
      restriction: "科管院,工工系優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100105", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "RnR5R6",
      meetings: [
        { slots: ["Rn","R5","R6"], room: "GEN IV綜四121", capacity: 190 },
      ],
      teachers: ["周瑞賢"],
      sizeLimit: 140, sizeNote: "新生保留80人", enrollment: 198,
      remarks: "HSS政治經濟學程必修,Location:near main school gate,beside Family Mart(大門口全家旁)",
      restriction: "科管院,國際學士班優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100106", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "F7F8F9",
      meetings: [
        { slots: ["F7","F8","F9"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["唐震宏"],
      sizeLimit: 80, sizeNote: "新生保留80人", enrollment: 94,
      remarks: "HSS政治經濟學程必修",
      restriction: "科管院,工工系優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100107", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "FnF5F6",
      meetings: [
        { slots: ["Fn","F5","F6"], room: "GEN IV綜四121", capacity: 190 },
      ],
      teachers: ["周嗣文"],
      sizeLimit: 100, sizeNote: "新生保留50人", enrollment: 178,
      remarks: "HSS政治經濟學程必修,Location:near main school gate,beside Family Mart(大門口全家旁)",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON100108", name: "經濟學原理一", nameEn: "Principles of Economics (I)", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "MXIC旺宏懷樸", capacity: 170 },
      ],
      teachers: ["廖肇寧"],
      sizeLimit: 170, sizeNote: "新生保留170人", enrollment: 184,
      remarks: "HSS政治經濟學程必修",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "MATH101005", name: "微積分Ａ一", nameEn: "Calculus (I)", credit: 4,
      time: "M3M4W1W2",
      meetings: [
        { slots: ["M3","M4","W1","W2"], room: "GEN III綜三 201", capacity: 120 },
      ],
      teachers: ["黃明傑"],
      sizeLimit: 100, sizeNote: "新生保留100人", enrollment: 105,
      remarks: "演習課時間為W19:00-21:00,地點為台積203,204,309",
      restriction: "計財系大學部1年級,科管院學士班大學部1年級優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: true, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "QF 100201", name: "資訊工程導論", nameEn: "Introduction to Information Engineering", credit: 3,
      time: "R7R8R9",
      meetings: [
        { slots: ["R7","R8","R9"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["陳政琦"],
      sizeLimit: 85, sizeNote: "新生保留85人", enrollment: 90,
      remarks: "",
      restriction: "限計財系大學部",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "QF 100401", name: "會計學一", nameEn: "Accounting (I)", credit: 3,
      time: "F6F7F8",
      meetings: [
        { slots: ["F6","F7","F8"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["賴興國"],
      sizeLimit: 110, sizeNote: "新生保留110人", enrollment: 50,
      remarks: "",
      restriction: "科管院學士班,計財系優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "QF 100403", name: "會計學一", nameEn: "Accounting (I)", credit: 3,
      time: "F6F7F8",
      meetings: [
        { slots: ["F6","F7","F8"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["張俊賢"],
      sizeLimit: 60, sizeNote: "新生保留60人", enrollment: 97,
      remarks: "",
      restriction: "科管院學士班大學部,計財系大學部優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 115B", grade: 1, section: null, type: "required" },
      ],
    },
    {
      no: "ECON206101", name: "個體經濟學一", nameEn: "Microeconomics (I)", credit: 3,
      time: "W3W4F3F4",
      meetings: [
        { slots: ["W3","W4","F3","F4"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["蔡璧涵"],
      sizeLimit: 70, sizeNote: "", enrollment: 101,
      remarks: "本課程上4小時, 科管院大2,3,4 以上未選上者,請第1次上課前線上申請加簽",
      restriction: "科管院,國際學士班優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n曾修經濟學原理一\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "ECON206102", name: "個體經濟學一", nameEn: "Microeconomics (I)", credit: 3,
      time: "W3W4F3F4",
      meetings: [
        { slots: ["W3","W4","F3","F4"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["周瑞賢"],
      sizeLimit: 75, sizeNote: "", enrollment: 101,
      remarks: "科管院大2,3,4 以上未選上者,請第1次上課前線上申請加簽",
      restriction: "科管院,國際學士班優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n曾修經濟學原理一\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "ECON206103", name: "個體經濟學一", nameEn: "Microeconomics (I)", credit: 3,
      time: "T3T4R3R4",
      meetings: [
        { slots: ["T3","T4","R3","R4"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["吳世英"],
      sizeLimit: 70, sizeNote: "", enrollment: 71,
      remarks: "科管院大2,3,4 以上未選上者,請第1次上課前線上申請加簽",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n曾修經濟學原理一\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "ECON206104", name: "個體經濟學一", nameEn: "Microeconomics (I)", credit: 3,
      time: "W7W8W9",
      meetings: [
        { slots: ["W7","W8","W9"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["黃賀寶"],
      sizeLimit: 70, sizeNote: "", enrollment: 70,
      remarks: "科管院大2,3,4 以上未選上者,請第1次上課前線上申請加簽",
      restriction: "科管院,國際學士班優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n曾修經濟學原理一\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "LST 350301", name: "法學緒論", nameEn: "Introductory Study of Law", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "GEN IV綜四224", capacity: 190 },
      ],
      teachers: ["黃忠正"],
      sizeLimit: 170, sizeNote: "", enrollment: 169,
      remarks: "地點:大門口全家Family Mart 旁",
      restriction: "科管院,大學部優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "LST 350302", name: "法學緒論", nameEn: "Introductory Study of Law", credit: 3,
      time: "M7M8M9",
      meetings: [
        { slots: ["M7","M8","M9"], room: "GEN IV綜四121", capacity: 190 },
      ],
      teachers: ["林昀嫺"],
      sizeLimit: 100, sizeNote: "", enrollment: 120,
      remarks: "",
      restriction: "科管院,大學部優先，第3次選課起開放全校修習",
      object: "*3", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "LST 350500", name: "民商法導論", nameEn: "Introduction to Civil & Commercial Law", credit: 3,
      time: "W2W3W4",
      meetings: [
        { slots: ["W2","W3","W4"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["黃若翔"],
      sizeLimit: 100, sizeNote: "", enrollment: 105,
      remarks: "",
      restriction: "科管院,大學部優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214101", name: "財務管理", nameEn: "Financial Management", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["黃德源"],
      sizeLimit: 80, sizeNote: "", enrollment: 86,
      remarks: "",
      restriction: "經濟系大學部,科管院學士班大學部,計財系大學部優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214102", name: "財務管理", nameEn: "Financial Management", credit: 3,
      time: "W6W7W8",
      meetings: [
        { slots: ["W6","W7","W8"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["謝佩芳"],
      sizeLimit: 80, sizeNote: "", enrollment: 80,
      remarks: "",
      restriction: "經濟系大學部,科管院學士班大學部,計財系大學部優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214104", name: "財務管理", nameEn: "Financial Management", credit: 3,
      time: "W6W7W8",
      meetings: [
        { slots: ["W6","W7","W8"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["余士迪"],
      sizeLimit: 94, sizeNote: "", enrollment: 113,
      remarks: "",
      restriction: "經濟系大學部,科管院學士班大學部,計財系大學部優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214106", name: "財務管理", nameEn: "Financial Management", credit: 3,
      time: "M2M3M4",
      meetings: [
        { slots: ["M2","M3","M4"], room: "TSMC台積204", capacity: 70 },
      ],
      teachers: ["邱婉茜"],
      sizeLimit: 70, sizeNote: "", enrollment: 69,
      remarks: "",
      restriction: "經濟系大學部,科管院學士班大學部,計財系大學部優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214401", name: "統計學一", nameEn: "Statistics (I)", credit: 3,
      time: "M3M4W2",
      meetings: [
        { slots: ["M3","M4","W2"], room: "PHYS物 019", capacity: 129 },
      ],
      teachers: ["余士迪"],
      sizeLimit: 94, sizeNote: "", enrollment: 123,
      remarks: "下學期「統計學二」授課教師未定",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "QF 214800", name: "線性代數", nameEn: "Linear Algebra", credit: 3,
      time: "T5T6R5",
      meetings: [
        { slots: ["T5","T6","R5"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["韓傳祥"],
      sizeLimit: 80, sizeNote: "", enrollment: 92,
      remarks: "",
      restriction: "限計財系大學部",
      object: "", prereq: null,
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
      ],
    },
    {
      no: "TM 200201", name: "管理學", nameEn: "Management", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "TSMC台積103", capacity: 94 },
      ],
      teachers: ["黃品潔"],
      sizeLimit: 50, sizeNote: "", enrollment: 60,
      remarks: "",
      restriction: "科管院,大學部2年級3年級4年級優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "TM 200202", name: "管理學", nameEn: "Management", credit: 3,
      time: "W7W8W9",
      meetings: [
        { slots: ["W7","W8","W9"], room: "TSMC台積908", capacity: 60 },
      ],
      teachers: ["王振源"],
      sizeLimit: 35, sizeNote: "", enrollment: 57,
      remarks: "",
      restriction: "大學部2年級3年級4年級優先，第3次選課起開放全校修習",
      object: "", prereq: null,
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 114B", grade: 2, section: null, type: "required" },
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "ECON309101", name: "總體經濟學一", nameEn: "Macroeconomics (I)", credit: 3,
      time: "M7M8M9",
      meetings: [
        { slots: ["M7","M8","M9"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["趙相科"],
      sizeLimit: 70, sizeNote: "", enrollment: 133,
      remarks: "下學期由李翎帆老師授課, 科管院大3,4 以上未選上者,請第1次上課前線上申請加簽",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n曾修經濟學原理二\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "ECON309102", name: "總體經濟學一", nameEn: "Macroeconomics (I)", credit: 3,
      time: "R3R4Rn",
      meetings: [
        { slots: ["R3","R4","Rn"], room: "TSMC台積224", capacity: 124 },
      ],
      teachers: ["陳惠鈞"],
      sizeLimit: 70, sizeNote: "", enrollment: 123,
      remarks: "科管院大3,4 以上未選上者,請第1次上課前線上申請加簽",
      restriction: "科管院優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n曾修經濟學原理二\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "ECON309103", name: "總體經濟學一", nameEn: "Macroeconomics (I)", credit: 3,
      time: "F2F3F4",
      meetings: [
        { slots: ["F2","F3","F4"], room: "TSMC台積203", capacity: 72 },
      ],
      teachers: ["盧姝璇"],
      sizeLimit: 60, sizeNote: "", enrollment: 92,
      remarks: "X-Class，科管院大3,4 以上未選上者,請第1次上課前線上申請加簽",
      restriction: "科管院,國際學士班優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n曾修經濟學原理二\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 314801", name: "數理統計一", nameEn: "Mathematical Statistics I", credit: 3,
      time: "T7T8T9",
      meetings: [
        { slots: ["T7","T8","T9"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["謝宗翰"],
      sizeLimit: 60, sizeNote: "", enrollment: 60,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n統計學一-成績需C-以上\n統計學二-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: true, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 314802", name: "數理統計一", nameEn: "Mathematical Statistics I", credit: 3,
      time: "M5M6M7",
      meetings: [
        { slots: ["M5","M6","M7"], room: "TSMC台積206", capacity: 62 },
      ],
      teachers: ["劉鋼"],
      sizeLimit: 50, sizeNote: "", enrollment: 22,
      remarks: "",
      restriction: "經濟系,科管院學士班,計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n統計學一-成績需C-以上\n統計學二-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 320101", name: "衍生性金融市場", nameEn: "Derivatives Market", credit: 3,
      time: "W7W8W9",
      meetings: [
        { slots: ["W7","W8","W9"], room: "TSMC台積204", capacity: 70 },
      ],
      teachers: ["鍾經樊"],
      sizeLimit: 70, sizeNote: "", enrollment: 59,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 320102", name: "衍生性金融市場", nameEn: "Derivatives Market", credit: 3,
      time: "M6M7M8",
      meetings: [
        { slots: ["M6","M7","M8"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["索樂晴"],
      sizeLimit: 80, sizeNote: "", enrollment: 104,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 320400", name: "高等微積分二", nameEn: "Advanced Calculus II", credit: 3,
      time: "R1R2R3",
      meetings: [
        { slots: ["R1","R2","R3"], room: "GEN III綜三 203", capacity: 110 },
      ],
      teachers: ["陳柏揚"],
      sizeLimit: 100, sizeNote: "", enrollment: 55,
      remarks: "演習課時間為T19:00-21:00,地點為綜三203",
      restriction: "限計財系大學部",
      object: "", prereq: "擋修對象 : 全校\n先修科目 :\n高等微積分一-成績需D以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 113B", grade: 3, section: null, type: "required" },
      ],
    },
    {
      no: "QF 414401", name: "投資學", nameEn: "Investment", credit: 3,
      time: "R6R7R8",
      meetings: [
        { slots: ["R6","R7","R8"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["索樂晴"],
      sizeLimit: 70, sizeNote: "", enrollment: 81,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 112B", grade: 4, section: null, type: "optional" },
      ],
    },
    {
      no: "QF 414402", name: "投資學", nameEn: "Investment", credit: 3,
      time: "T2T3T4",
      meetings: [
        { slots: ["T2","T3","T4"], room: "TSMC台積104", capacity: 94 },
      ],
      teachers: ["張焯然"],
      sizeLimit: 70, sizeNote: "", enrollment: 42,
      remarks: "",
      restriction: "計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 112B", grade: 4, section: null, type: "optional" },
      ],
    },
    {
      no: "QF 414403", name: "投資學", nameEn: "Investment", credit: 3,
      time: "M6M7M8",
      meetings: [
        { slots: ["M6","M7","M8"], room: "TSMC台積309", capacity: 80 },
      ],
      teachers: ["楊子慧"],
      sizeLimit: 60, sizeNote: "", enrollment: 30,
      remarks: "非常態性開課",
      restriction: "經濟系,科管院學士班,計財系優先，第3次選課起開放全校修習",
      object: "", prereq: "擋修對象 : 大學部\n先修科目 :\n財務管理-成績需C-以上\n上述條件一定要有，則不擋修。",
      offeredInEnglish: false, noExtraSelection: false, placeholder: false,
      listings: [
        { classCode: "QF 112B", grade: 4, section: null, type: "optional" },
      ],
    },
  ],
};
