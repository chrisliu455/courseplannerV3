/**
 * ui/views/section-picker.js — 選班視窗
 *
 * 列出這門課所在學期、同名課程的各班（科號、老師、時段、教室、人數），
 * 每一班都先跟這學期其他已排時段的課比對，會衝堂的直接標出來，選之前就看得到。
 * 課名對不上時（例：規劃裡的「大學中文」vs 開課表的「大學中文(至中文系…)」）可以用關鍵字搜尋。
 *
 * 只負責畫面；選班寫回 store.setSection，規則（只能選該學期有的科號、鎖住的學期不能改）在 store 裡。
 */

import { store } from '../store.js';
import { $, esc, toast } from '../dom.js';
import { SEMESTERS } from '../../rulesets/index.js';
import { OFFERINGS } from '../../offerings/index.js';
import { sectionCandidates, findSection, slotsOf, sortSlots } from '../../engine/index.js';

export function openSectionPicker(courseId) {
  const course = store.plan.courses.find((c) => c.id === courseId);
  if (!course || !course.semester) return;

  const sem = SEMESTERS.find((s) => s.id === course.semester);
  const term = store.termKeyOf(course.semester);
  const locked = store.isSemesterLocked(course.semester);
  let keyword = '';
  let chosen = course.section;

  /* 同學期其他已有時段的課：拿來預先比對衝堂 */
  const others = store.plan.courses
    .filter((c) => c.semester === course.semester && c.id !== course.id)
    .map((c) => ({ name: c.name, slots: slotsOf(store.sectionOf(c)) }))
    .filter((o) => o.slots.length);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal sec-modal" role="dialog" aria-modal="true" aria-label="選班：${esc(course.name)}">
      <h3>選班：${esc(course.name)}</h3>
      <p class="sub" id="pickSub"></p>
      ${locked ? '<div class="notice">這個學期已鎖定，只能查看，不能換班。</div>' : ''}
      <div id="pickList"></div>
      <input type="text" class="sec-search" id="pickSearch" placeholder="找不到？輸入課名的一部分或科號，例：經濟學、PME 2002">
      <div class="modal-actions">
        ${course.section && !locked ? '<button class="btn-ghost btn-small" id="pickClear" type="button">取消選班</button>' : ''}
        <span class="spacer"></span>
        <button class="btn-ghost btn-small" id="pickClose" type="button">關閉</button>
        ${locked ? '' : '<button class="btn-primary sec-ok" id="pickOk" type="button">確定</button>'}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  function candidates() {
    const list = keyword
      ? sectionCandidates(OFFERINGS, term, { keyword })
      : sectionCandidates(OFFERINGS, term, { name: course.name });
    // 之前用關鍵字選的班，課名不一定相同：沒在清單裡就補在最前面，免得看不到目前選的是哪一班
    if (!keyword && course.section && !list.some((s) => s.no === course.section)) {
      const cur = findSection(OFFERINGS, term, course.section);
      if (cur) list.unshift(cur);
    }
    return list;
  }

  function renderList() {
    const list = candidates();
    $('#pickSub', overlay).textContent =
      `${sem ? sem.year + sem.term : ''} · ${term || '—'} · ` +
      (keyword ? `關鍵字「${keyword}」找到 ${list.length} 班` : `同名課程 ${list.length} 班`);

    $('#pickList', overlay).innerHTML = list.length
      ? list.map(rowHTML).join('')
      : `<p class="empty-note">${
          keyword
            ? '沒有符合的課。'
            : '這學期的開課資料裡沒有同名的課，可以用下面的搜尋找找看。目前資料庫只收了部分系所的課表。'
        }</p>`;
  }

  function rowHTML(s) {
    const slots = slotsOf(s);
    const clashWith = others.filter((o) => o.slots.some((x) => slots.includes(x))).map((o) => o.name);
    const rooms = [...new Set(s.meetings.map((m) => m.room).filter(Boolean))].join('、');
    const facts = [
      sortSlots(slots).join(' ') || '沒有固定時段',
      rooms,
      `人限 ${s.sizeLimit ?? '—'} / 已選 ${s.enrollment ?? '—'}`,
    ].filter(Boolean);
    return `
      <label class="sec-row${s.no === chosen ? ' on' : ''}">
        <input type="radio" name="pickSection" value="${esc(s.no)}" ${s.no === chosen ? 'checked' : ''} ${locked ? 'disabled' : ''}>
        <span class="sec-main">
          <span class="sec-title"><span class="mono">${esc(s.no)}</span>　${esc(s.name)}　${esc((s.teachers || []).join('、'))}${
      s.offeredInEnglish ? '　<span class="sec-tag">英語授課</span>' : ''
    }</span>
          <span class="sec-facts">${esc(facts.join(' · '))}</span>
          ${s.restriction ? `<span class="sec-limit">${esc(s.restriction)}</span>` : ''}
        </span>
        <span class="sec-flags">
          ${s.reference ? `<span class="sec-tag ref">參考 ${esc(s.sourceTerm)}</span>` : ''}
          ${clashWith.length ? `<span class="sec-tag bad">與 ${esc(clashWith.join('、'))} 衝堂</span>` : ''}
        </span>
      </label>`;
  }

  renderList();

  /* ── 事件 ── */
  const onKey = (e) => e.key === 'Escape' && close();
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close(); // 點視窗外面的灰色區域
  });
  $('#pickClose', overlay).addEventListener('click', close);

  $('#pickSearch', overlay).addEventListener('input', (e) => {
    keyword = e.target.value.trim();
    renderList();
  });
  $('#pickList', overlay).addEventListener('change', (e) => {
    if (e.target.name !== 'pickSection') return;
    chosen = e.target.value;
    overlay.querySelectorAll('.sec-row').forEach((r) => r.classList.toggle('on', r.contains(e.target)));
  });

  $('#pickClear', overlay)?.addEventListener('click', () => {
    store.setSection(course.id, null);
    toast('已取消選班，這門課移到「未定時段」');
    close();
  });
  $('#pickOk', overlay)?.addEventListener('click', () => {
    if (!chosen || chosen === course.section) return close();
    if (store.setSection(course.id, chosen)) toast(`已選 ${chosen}`);
    else toast('這個學期沒有這個科號，沒辦法選');
    close();
  });
}
