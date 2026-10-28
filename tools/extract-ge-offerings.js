/**
 * tools/extract-ge-offerings.js — 從清大「通識課程總錄」頁面抽出開課資料
 *
 * 跟 tools/extract-offerings.js 一樣，不是給 Node 跑的，是在「瀏覽器的總錄頁」裡執行：
 *   1. 到校務資訊系統 → 通識課程總錄，選好學期，查詢
 *   2. 停在結果頁（JH62f002.php），在那個分頁執行這整個檔案
 *      （Claude 在內建瀏覽器裡執行；自己操作時可貼到 DevTools Console）
 *   3. 回傳值的 source 就是 offerings/<學期>/GE.js 的完整內容，
 *      file 是建議的存檔路徑，warnings 列出需要人工確認的地方
 *
 * 只讀取網頁內容：不送出任何請求、不修改頁面。
 * 網頁連結裡的 ACIXSTORE（登入階段代碼）不會被寫進輸出。
 *
 * 總錄頁的結構（跟系所課表不同）：
 *   標題 <p>：115學年度第1學期通識課程總錄
 *   每個領域一張表，表前的 <p> 是領域名稱（核心通識、自然科學領域…）；
 *   表裡一列只有一格的是分類（向度一：…、應用科學類…），後面接欄位標題列與各門課，每門課固定 12 欄：
 *     0 科號（前面多了學年學期，例 11510GEC 110301）  1 課名（中英文直接接在一起）
 *     2 學分  3 上課時間  4 教室／容量  5 教師  6 修課人數  7 人限  8 對象  9 擋修  10 備註  11 大綱
 *   沒有班級與必／選修，所以 classes、listings 都是空的；改記每門課屬於哪個領域與分類（geCategories）。
 */
(() => {
  const warnings = [];
  const warn = (msg) => warnings.push(msg);

  /* ── 文字工具 ─────────────────────────────── */
  const clean = (s) => (s || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();

  /** 以 <br> 切行，回傳去掉空白行的文字陣列 */
  function lines(el) {
    if (!el) return [];
    const html = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    const box = document.createElement('div');
    box.innerHTML = html;
    return box.textContent.split('\n').map(clean).filter(Boolean);
  }

  const text = (el) => lines(el).join('\n');
  /** 中文字與全形符號（含「：」「（」「Ａ」） */
  const CJK = /[　-〿㐀-鿿＀-￯]/;
  const hasCJK = (s) => CJK.test(s);
  const toInt = (s) => (/^\d+$/.test(clean(s)) ? Number(clean(s)) : null);

  /** 只留開頭的中文部分：「核心通識Core GE courses」→「核心通識」、「應用科學類 Applied Science」→「應用科學類」 */
  const zhPart = (s) => clean((clean(s).match(/^[^A-Za-z]*/) || [''])[0]);

  /**
   * 課名中英文接在一起：「價值與實踐Value and Practice」→ 在最後一個中文字之後切開。
   * 「最後一個中文字」只算漢字、全形英數與收尾的括號書名號，不算「．」這類分隔符號：
   * 「台語．歌曲與社會Taiwanese．Popular songs and Society」的英文名裡也有全形「．」，不能切在那裡
   */
  const NAME_END = /[㐀-鿿０-９Ａ-Ｚａ-ｚ》」』）〉]/;
  function splitName(raw) {
    const s = clean(raw);
    let cut = -1;
    for (let i = 0; i < s.length; i++) if (NAME_END.test(s[i])) cut = i;
    if (cut < 0) return { name: s, nameEn: '' };
    return { name: clean(s.slice(0, cut + 1)), nameEn: clean(s.slice(cut + 1)) };
  }

  const DIMENSION = { 一: 1, 二: 2, 三: 3, 四: 4 };

  /* ── 學期：頁面標題 115學年度第1學期通識課程總錄 ── */
  const titleEl = [...document.querySelectorAll('p, div, center, font')].find((el) =>
    /^\d+學年度第\d學期通識課程總錄$/.test(clean(el.textContent))
  );
  const tm = clean(titleEl?.textContent).match(/^(\d+)學年度第(\d)學期/);
  if (!tm) return { error: '這一頁找不到「○○學年度第○學期通識課程總錄」標題，請確認停在通識課程總錄的結果頁' };
  const year = Number(tm[1]);
  const term = Number(tm[2]);
  const semester = `${year}-${term}`;
  const noPrefix = `${year}${term}0`; // 科號前面多出來的學年學期，例 11510

  /* ── 上課時間與教室（跟系所課表相同的寫法）──── */
  const SLOT = /[MTWRFSU][1-9nabc]/g;

  function parseSlots(line, no) {
    const slots = line.match(SLOT) || [];
    if (slots.join('') !== line.replace(/\s+/g, '')) warn(`${no} 上課時間有無法辨識的部分：「${line}」`);
    return slots;
  }

  function parseMeetings(timeCell, roomCell, no) {
    const times = lines(timeCell);
    const roomLines = lines(roomCell);
    const rooms = [];
    for (let i = 0; i < roomLines.length; i++) {
      const cap = roomLines[i + 1]?.match(/^／容量\s*(\d+)$/);
      rooms.push({ room: roomLines[i], capacity: cap ? Number(cap[1]) : null });
      if (cap) i++;
    }
    if (rooms.length && times.length && rooms.length !== times.length) {
      warn(`${no} 時段數（${times.length}）和教室數（${rooms.length}）對不上，請人工確認教室對應`);
    }
    return times.map((t, i) => ({
      slots: parseSlots(t, no),
      room: rooms[i]?.room ?? null,
      capacity: rooms[i]?.capacity ?? null,
    }));
  }

  /* ── 教師：中文名<br>英文名 成對出現，只有一種時照收 ── */
  function parseTeachers(cell) {
    const out = [];
    for (const l of lines(cell)) {
      const prev = out[out.length - 1];
      if (!hasCJK(l) && prev && prev.zh && !prev.en) prev.en = l;
      else out.push(hasCJK(l) ? { zh: l, en: null } : { zh: null, en: l });
    }
    return out.map((t) => t.zh || t.en);
  }

  /* ── 備註欄：紅字＝授課語言；「新生保留○人」歸人限附註；《不接受加簽》另記；其餘都是備註 ── */
  function parseRemarks(cell) {
    const NO_EXTRA = /《?不接受加簽\s*No extra selection》?/;
    const red = [...cell.querySelectorAll('font[color="red"]')].map(text).join('\n');
    const box = cell.cloneNode(true);
    box.querySelectorAll('font[color="red"]').forEach((f) => f.remove());
    const rest = lines(box).map((l) => clean(l.replace(NO_EXTRA, ''))).filter(Boolean);
    const reserve = rest.filter((l) => /^新生保留\d+人$/.test(l));
    return {
      remarks: rest.filter((l) => !reserve.includes(l)).join('\n'),
      reserve: reserve.join('\n'),
      offeredInEnglish: /Offered in English/i.test(red),
      noExtraSelection: NO_EXTRA.test(cell.textContent),
    };
  }

  /* ── 逐表逐列解析 ───────────────────────────── */
  // 合併的 key 是「科號＋時段」：同一門課列在兩個分類時只存一筆，分類都記在 geCategories
  const byKey = new Map();
  let rowCount = 0;

  for (const table of document.querySelectorAll('table')) {
    if (!table.rows.length) continue;
    const area = zhPart(table.previousElementSibling?.textContent);
    let group = null;

    for (const row of table.rows) {
      const c = row.cells;
      if (c.length === 1) {
        group = zhPart(row.textContent);
        continue;
      }
      if (/科號/.test(c[0]?.textContent)) continue; // 欄位標題列
      if (c.length !== 12) {
        warn(`${area}／${group} 有一列欄位數是 ${c.length}（預期 12），已略過`);
        continue;
      }
      rowCount++;

      const rawNo = clean(c[0].textContent).replace(/\s+/g, ' ');
      if (!rawNo.startsWith(noPrefix)) warn(`${rawNo} 科號開頭不是 ${noPrefix}，照原樣保留`);
      const no = rawNo.startsWith(noPrefix) ? rawNo.slice(noPrefix.length) : rawNo;
      const dim = group?.match(/^向度([一二三四])/);
      const category = { area, group, dimension: area === '核心通識' && dim ? DIMENSION[dim[1]] : null };

      const time = lines(c[3]).join('');
      const key = `${no}|${time}`;
      if (byKey.has(key)) {
        byKey.get(key).geCategories.push(category);
        continue;
      }

      const { name, nameEn } = splitName(c[1].textContent);
      const remarks = parseRemarks(c[10]);
      const sizeText = clean(c[7].textContent);
      const prereq = text(c[9]);
      byKey.set(key, {
        no,
        name,
        nameEn,
        credit: Number(clean(c[2].textContent)),
        time,
        meetings: parseMeetings(c[3], c[4], no),
        teachers: parseTeachers(c[5]),
        sizeLimit: toInt(sizeText),
        sizeNote: [toInt(sizeText) === null ? sizeText : '', remarks.reserve].filter(Boolean).join('\n'),
        enrollment: toInt(c[6].textContent),
        remarks: remarks.remarks,
        restriction: '',
        object: text(c[8]),
        prereq: prereq || null,
        offeredInEnglish: remarks.offeredInEnglish,
        noExtraSelection: remarks.noExtraSelection,
        placeholder: false,
        geCategories: [category],
      });
    }
  }

  if (!rowCount) return { error: '這一頁找不到課程表格，請確認停在通識課程總錄的結果頁' };

  /* ── 輸出成 JS 模組原始碼 ─────────────────────── */
  const courses = [...byKey.values()];
  const d = new Date();
  const today = [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
  const j = JSON.stringify;

  const courseSrc = (x) =>
    [
      `    {`,
      `      no: ${j(x.no)}, name: ${j(x.name)}, nameEn: ${j(x.nameEn)}, credit: ${x.credit},`,
      `      time: ${j(x.time)},`,
      x.meetings.length
        ? [
            `      meetings: [`,
            ...x.meetings.map((m) => `        { slots: ${j(m.slots)}, room: ${j(m.room)}, capacity: ${j(m.capacity)} },`),
            `      ],`,
          ].join('\n')
        : `      meetings: [],`,
      `      teachers: ${j(x.teachers)},`,
      `      sizeLimit: ${j(x.sizeLimit)}, sizeNote: ${j(x.sizeNote)}, enrollment: ${j(x.enrollment)},`,
      `      remarks: ${j(x.remarks)},`,
      `      restriction: ${j(x.restriction)},`,
      `      object: ${j(x.object)}, prereq: ${j(x.prereq)},`,
      `      offeredInEnglish: ${x.offeredInEnglish}, noExtraSelection: ${x.noExtraSelection}, placeholder: ${x.placeholder},`,
      `      geCategories: [`,
      ...x.geCategories.map(
        (g) => `        { area: ${j(g.area)}, group: ${j(g.group)}, dimension: ${j(g.dimension)} },`
      ),
      `      ],`,
      `      listings: [],`,
      `    },`,
    ].join('\n');

  const source = [
    `/**`,
    ` * offerings/${semester}/GE.js — ${year} 學年度第 ${term} 學期・通識課程開課資料`,
    ` *`,
    ` * 由 tools/extract-ge-offerings.js 從「通識課程總錄」頁面產生，請不要手改；`,
    ` * 資料有誤時重新查詢、重新產生。`,
    ` *`,
    ` * 抓取日期：${today}。enrollment（修課人數）是當天的數字，之後會變動。`,
    ` * 通識課沒有班級與必／選修，classes、listings 都是空的；`,
    ` * geCategories 記每門課屬於哪個領域、哪個分類，核心通識另記向度（dimension 1～4）。`,
    ` */`,
    ``,
    `export default {`,
    `  id: ${j(`offerings.${semester}.GE`)},`,
    `  semester: ${j(semester)}, year: ${year}, term: ${term},`,
    `  dept: "GE", deptName: "通識", deptNameEn: "General Education",`,
    `  source: '清華大學校務資訊系統・通識課程總錄',`,
    `  fetchedAt: ${j(today)},`,
    ``,
    `  classes: [],`,
    ``,
    `  /** 同科號同時段只存一筆；同一門課列在多個分類時，分類都記在 geCategories */`,
    `  courses: [`,
    ...courses.map(courseSrc),
    `  ],`,
    `};`,
    ``,
  ].join('\n');

  return {
    file: `offerings/${semester}/GE.js`,
    summary: { semester, rows: rowCount, courses: courses.length },
    warnings,
    source,
  };
})();
