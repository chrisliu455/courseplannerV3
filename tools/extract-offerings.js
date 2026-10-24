/**
 * tools/extract-offerings.js — 從清大「各系所必選修課程」結果頁抽出開課資料
 *
 * 這支不是給 Node 跑的，是在「瀏覽器的結果頁」裡執行：
 *   1. 到校務資訊系統 → 各系所必選修課程（JH623001.php），選好學期與系所，查詢
 *   2. 停在結果頁（JH623002.php），在那個分頁執行這整個檔案
 *      （Claude 在內建瀏覽器裡執行；自己操作時可貼到 DevTools Console）
 *   3. 回傳值的 source 就是 offerings/<學期>/<系所>.js 的完整內容，
 *      file 是建議的存檔路徑，warnings 列出需要人工確認的地方
 *
 * 只要部分課程時（例：輔系只認列某些科目），執行本檔之前先在同一個分頁設定：
 *   EXTRACT_ONLY = ['經濟學原理一', '統計學一', ...]
 * 課名要完全相同，但全形／半形與空白不計（「微積分Ａ一」＝「微積分A一」）。
 * 沒設定時全部收錄。清單上有、頁面上找不到的課名會列在 warnings。
 *
 * 只讀取網頁內容：不送出任何請求、不修改頁面。
 * 網頁連結裡的 ACIXSTORE（登入階段代碼）不會被寫進輸出。
 *
 * 結果頁的結構（每個班級一張表，每列固定 13 欄）：
 *   0 科號  1 科目(中<br>英)  2 學分  3 上課時間  4 教室／容量  5 教師
 *   6 人限  7 必／選  8 修課人數  9 備註  10 對象  11 擋修  12 大綱
 * 備註欄裡：紅字＝授課語言、藍字＝課程備註、黑字＝修課限制，另可能有《不接受加簽》。
 */
(() => {
  const warnings = [];
  const warn = (msg) => warnings.push(msg);

  /* ── 選項：只收錄指定課名 ─────────────────────── */
  const ONLY = Array.isArray(globalThis.EXTRACT_ONLY) ? globalThis.EXTRACT_ONLY : null;
  const nameKey = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '');
  const onlyKeys = ONLY && new Set(ONLY.map(nameKey));
  const matched = new Set();
  let skipped = 0;

  /* ── 文字工具 ─────────────────────────────── */
  const clean = (s) => (s || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();

  /** 以 <br> 切行，回傳去掉空白行的文字陣列 */
  function lines(el) {
    if (!el) return [];
    const html = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    const box = document.createElement('div');
    box.innerHTML = html;
    return box.textContent.split('\n').map(clean).filter(Boolean);
  }

  const text = (el) => lines(el).join('\n');
  const hasCJK = (s) => /[\u3400-\u9fff]/.test(s);
  const toInt = (s) => (/^\d+$/.test(s || '') ? Number(s) : null);

  /* ── 班級標題：115學年度第1學期動機系一年級清班(PME 115BA)課程 ──
   *   最高年級在下學期會寫成「畢業班」：114學年度第2學期動機系畢業班清班(PME 111BA)課程
   *   這時年級用「學年度 − 入學年 + 1」推算 */
  const GRADE_WORDS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7 };

  function parseHeading(table) {
    // 表格前面依序是：<p>中文標題</p>、英文系名、英文學制，往回找最近的 <p>
    const before = [];
    let el = table.previousElementSibling;
    while (el && el.tagName !== 'P') {
      before.unshift(el);
      el = el.previousElementSibling;
    }
    const title = clean(el?.textContent);
    const m = title.match(/^(\d+)學年度第(\d)學期(.+)\(([A-Z]+)\s*(\d+)([A-Z0-9]*)\)課程$/);
    if (!m) {
      warn(`看不懂的班級標題：「${title}」`);
      return null;
    }
    const [, year, term, label, dept, entry, suffix] = m;
    const g = label.match(/([一二三四五六七])年級/);
    const s = label.match(/(?:年級|畢業班)(.+)班$/);
    return {
      year: Number(year),
      term: Number(term),
      dept,
      deptName: label.replace(/(?:[一二三四五六七]年級|畢業班).*$/, ''),
      deptNameEn: clean(before.find((b) => b.tagName === 'FONT')?.textContent),
      classCode: `${dept} ${entry}${suffix}`,
      label,
      grade: g ? GRADE_WORDS[g[1]] : Number(year) - Number(entry) + 1,
      section: s ? s[1] : null,
    };
  }

  /* ── 上課時間與教室 ─────────────────────────── */
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
    if (rooms.length && rooms.length !== times.length) {
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

  /* ── 備註欄：依字色分類 ─────────────────────── */
  function parseRemarks(cell, no) {
    const NO_EXTRA = /《?不接受加簽\s*No extra selection》?/;
    const byColor = (c) =>
      [...cell.querySelectorAll(`font[color="${c}"]`)].map(text).filter(Boolean).join('\n');
    const red = byColor('red');
    const blue = byColor('#0404B4');
    const black = byColor('black');

    // 不在任何彩色 font 裡的零散文字（例：《不接受加簽》）
    const box = cell.cloneNode(true);
    box.querySelectorAll('font[color]').forEach((f) => f.remove());
    let loose = text(box);
    const noExtraSelection = NO_EXTRA.test(cell.textContent);
    loose = clean(loose.replace(NO_EXTRA, ''));

    const offeredInEnglish = /Offered in English/i.test(red);
    const redRest = clean(red.replace(/\/?Offered in English/i, ''));
    if (redRest) warn(`${no} 備註紅字有語言以外的內容：「${redRest}」（已併入 remarks）`);
    if (loose) warn(`${no} 備註有未分類的文字：「${loose}」（已併入 remarks）`);

    return {
      remarks: [blue, redRest, loose].filter(Boolean).join('\n'),
      restriction: black,
      offeredInEnglish,
      noExtraSelection,
    };
  }

  /* ── 逐列解析 ─────────────────────────────── */
  const TYPE = { 必: 'required', 選: 'optional' };
  // 合併的 key 是「科號＋時段」：同科號同時段才併成一筆，時段不同就分開存並發警告
  const byKey = new Map();
  const classes = [];
  let meta = null;
  let rowCount = 0;

  for (const table of document.querySelectorAll('table')) {
    const head = parseHeading(table);
    if (!head) continue;
    if (!meta) meta = head;
    else if (head.dept !== meta.dept || head.year !== meta.year || head.term !== meta.term) {
      warn(`同一頁出現不同學期或系所：${head.classCode}（${head.year}-${head.term}），已略過`);
      continue;
    }
    classes.push({ classCode: head.classCode, label: head.label, grade: head.grade, section: head.section });

    for (const row of [...table.rows].slice(1)) {
      const c = row.cells;
      if (c.length !== 13) {
        warn(`${head.classCode} 有一列欄位數是 ${c.length}（預期 13），已略過`);
        continue;
      }
      rowCount++;
      const no = clean(c[0].textContent).replace(/\s+/g, ' ');
      const [name = '', nameEn = ''] = lines(c[1]);
      if (onlyKeys) {
        if (!onlyKeys.has(nameKey(name))) {
          skipped++;
          continue;
        }
        matched.add(nameKey(name));
      }
      const typeWord = lines(c[7])[0];
      const listing = {
        classCode: head.classCode,
        grade: head.grade,
        section: head.section,
        type: TYPE[typeWord] || null,
      };
      if (!listing.type) warn(`${no} 看不懂的必選修欄：「${typeWord}」`);

      const time = lines(c[3]).join('');
      const key = `${no}|${time}`;
      if (byKey.has(key)) {
        byKey.get(key).listings.push(listing);
        continue;
      }
      const sameNo = [...byKey.values()].find((x) => x.no === no);
      if (sameNo) {
        warn(
          `${no} 在 ${head.classCode} 的時段（${time || '無'}）和 ${sameNo.listings[0].classCode} ` +
            `的時段（${sameNo.time || '無'}）不同，已分開存成兩筆，請人工確認`
        );
      }

      const [size, ...sizeRest] = lines(c[6]);
      const prereq = text(c[11]);
      byKey.set(key, {
        no,
        name,
        nameEn,
        credit: Number(clean(c[2].textContent)),
        time,
        meetings: parseMeetings(c[3], c[4], no),
        teachers: parseTeachers(c[5]),
        sizeLimit: toInt(size),
        sizeNote: [toInt(size) === null ? size : null, ...sizeRest].filter(Boolean).join('\n'),
        enrollment: toInt(clean(c[8].textContent)),
        ...parseRemarks(c[9], no),
        object: text(c[10]),
        prereq: prereq || null,
        placeholder: /^YZ\s/.test(no),
        listings: [listing],
      });
    }
  }

  if (!meta) return { error: '這一頁找不到開課表，請確認停在查詢結果頁（JH623002.php）' };

  if (ONLY) {
    const missing = ONLY.filter((n) => !matched.has(nameKey(n)));
    if (missing.length) {
      warn(`EXTRACT_ONLY 裡有 ${missing.length} 個課名在這一頁找不到（可能在別的學期開，或不在本系課表上）：${missing.join('、')}`);
    }
  }

  /* ── 輸出成 JS 模組原始碼 ─────────────────────── */
  const courses = [...byKey.values()];
  const semester = `${meta.year}-${meta.term}`;
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
      `      listings: [`,
      ...x.listings.map(
        (l) => `        { classCode: ${j(l.classCode)}, grade: ${l.grade}, section: ${j(l.section)}, type: ${j(l.type)} },`
      ),
      `      ],`,
      `    },`,
    ].join('\n');

  const source = [
    `/**`,
    ` * offerings/${semester}/${meta.dept}.js — ${meta.year} 學年度第 ${meta.term} 學期・${meta.deptName}（${meta.dept}）開課資料`,
    ` *`,
    ` * 由 tools/extract-offerings.js 從「各系所必選修課程」查詢結果頁產生，請不要手改；`,
    ` * 資料有誤時重新查詢、重新產生。`,
    ` *`,
    ` * 抓取日期：${today}。enrollment（修課人數）是當天的數字，之後會變動。`,
    ` * placeholder: true 的課（科號 YZ 開頭）只是提醒「到別系總錄選課」，不是真正的開課。`,
    ...(ONLY ? [` *`, ` * 只收錄 EXTRACT_ONLY 指定的課名（共 ${ONLY.length} 個，見 only 欄位），其餘課程沒有收錄。`] : []),
    ` */`,
    ``,
    `export default {`,
    `  id: ${j(`offerings.${semester}.${meta.dept}`)},`,
    `  semester: ${j(semester)}, year: ${meta.year}, term: ${meta.term},`,
    `  dept: ${j(meta.dept)}, deptName: ${j(meta.deptName)}, deptNameEn: ${j(meta.deptNameEn)},`,
    `  source: '清華大學校務資訊系統・各系所必選修課程',`,
    `  fetchedAt: ${j(today)},`,
    ...(ONLY ? [``, `  /** 只收錄這些課名；沒有這個欄位＝全部收錄 */`, `  only: ${j(ONLY)},`] : []),
    ``,
    `  /** 這份資料涵蓋的班級課表 */`,
    `  classes: [`,
    ...classes.map(
      (c) => `    { classCode: ${j(c.classCode)}, label: ${j(c.label)}, grade: ${c.grade}, section: ${j(c.section)} },`
    ),
    `  ],`,
    ``,
    `  /** 同科號同時段只存一筆，出現在哪些班級課表記在 listings；同科號但時段不同會分成多筆 */`,
    `  courses: [`,
    ...courses.map(courseSrc),
    `  ],`,
    `};`,
    ``,
  ].join('\n');

  return {
    file: `offerings/${semester}/${meta.dept}.js`,
    summary: { semester, dept: meta.dept, classes: classes.length, rows: rowCount, skipped, courses: courses.length },
    warnings,
    source,
  };
})();
