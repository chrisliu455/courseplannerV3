/**
 * ui/views/week.js — 週課表模式：八個學期各一張「週一～週五 × 節次」的表
 *
 * 跟列表模式（grid.js）讀的是同一份 plan.courses，任一邊移動課程，另一邊重畫時就同步了。
 * 課要先「選班」或設定「自訂時段」才知道上課時間（store.sectionOf）；還沒有時段、或選的班沒有固定時段的課，
 * 放在卡片下方的「未定時段」區。衝堂判定交給 engine/schedule.js，這裡只負責畫出來。
 *
 * 拖曳：
 *   格子裡的課（.tt-block）由這支自己處理
 *   未定時段區用的是一般課程卡（.chip），拖曳、點選、↩ 移回待排都沿用 pool.js 綁在 document 上的處理
 *   卡片外層也掛 .sem-card，讓 pool.js「鎖住的學期不能動」的判斷一體適用
 */

import { store } from '../store.js';
import { $, esc, num, toast } from '../dom.js';
import { SEMESTERS } from '../../rulesets/index.js';
import { OFFERINGS } from '../../offerings/index.js';
import { tagTable, PERIODS, sourcesFor, slotsOf, sectionCandidates, findConflicts, sortSlots } from '../../engine/index.js';
import { chipHTML, getSelectedId, clearSelection } from './pool.js';
import { lockIcon } from './grid.js';
import { openSectionPicker } from './section-picker.js';

const WEEKDAYS = ['M', 'T', 'W', 'R', 'F'];
const DAY_LABEL = { M: '一', T: '二', W: '三', R: '四', F: '五', S: '六', U: '日' };
/** 中午與晚上的節次：灰底，跟白天區分 */
const QUIET = new Set(['n', 'a', 'b', 'c']);

let bound = false;

export function renderWeek() {
  const box = $('#weekGrid');
  if (!box) return;
  const { plan, ruleset } = store;
  const tags = tagTable(plan, ruleset);
  box.innerHTML = SEMESTERS.map((sem) => semesterCard(sem, tags)).join('');
  if (!bound) bindEvents(box);
}

/** 一個學期的排課狀況：哪些課有時段、哪些沒有，以及衝堂 */
function scheduleOf(semId) {
  const courses = store.plan.courses.filter((c) => c.semester === semId);
  const placed = [];
  const unplaced = [];
  for (const course of courses) {
    const section = store.sectionOf(course);
    const slots = slotsOf(section);
    (slots.length ? placed : unplaced).push({ course, section, slots });
  }
  const conflicts = findConflicts(placed.map((p) => ({ id: p.course.id, slots: p.slots })));
  return { courses, placed, unplaced, conflicts };
}

function semesterCard(sem, tags) {
  const term = store.termKeyOf(sem.id);
  const { courses, placed, unplaced, conflicts } = scheduleOf(sem.id);
  const credits = courses.reduce((s, c) => s + (Number(c.credit) || 0), 0);
  const locked = store.isSemesterLocked(sem.id);
  const nameOf = (id) => courses.find((c) => c.id === id)?.name || '';
  const clash = conflicts.pairs.length;

  return `
    <div class="sem-card wk-card${locked ? ' locked' : ''}${clash ? ' clash' : ''}" data-sem="${esc(sem.id)}">
      <div class="sem-head">
        <h3>${esc(sem.year)} ${esc(sem.term)}</h3>
        <span class="wk-term mono">${esc(term || '')}</span>
        <button class="lock-btn${locked ? ' on' : ''}" data-lock="${esc(sem.id)}" type="button"
                aria-pressed="${locked}"
                title="${locked ? '解鎖，恢復編輯' : '鎖住這個學期，避免誤動已排好的課'}">
          ${lockIcon(locked)}
        </button>
        <span class="spacer"></span>
        ${clash ? `<span class="wk-clash-badge">衝堂 ${clash}</span>` : ''}
        <span class="credit-badge">${num(credits)} 學分</span>
      </div>
      <div class="wk-body">
        ${courses.length ? sourceNote(term) : ''}
        ${conflicts.pairs
          .map((p) => `<div class="wk-clash-line">${esc(nameOf(p.a))} × ${esc(nameOf(p.b))}：${esc(p.slots.join(' '))}</div>`)
          .join('')}
        ${timetable(placed, tags, locked)}
        ${unplacedTray(unplaced, tags, locked, term, courses.length)}
      </div>
    </div>`;
}

/** 這學期還沒有正式開課資料時，說明時段是參考哪一學期的 */
function sourceNote(term) {
  if (!term) return '';
  const src = sourcesFor(OFFERINGS, term);
  if (!src.length) return `<div class="wk-note">沒有 ${esc(term)} 的開課資料，這學期的課沒辦法選班</div>`;
  const refs = [...new Set(src.filter((s) => s.reference).map((s) => s.offering.semester))];
  if (!refs.length) return '';
  const lead = src.every((s) => s.reference) ? `尚無 ${term} 開課資料` : `部分系所尚無 ${term} 開課資料`;
  return `<div class="wk-note">${esc(lead)}，時段參考 ${esc(refs.join('、'))}</div>`;
}

function timetable(placed, tags, locked) {
  const bySlot = new Map();
  for (const p of placed) {
    for (const s of p.slots) {
      if (!bySlot.has(s)) bySlot.set(s, []);
      bySlot.get(s).push(p);
    }
  }
  // 週六、週日平常不佔版面，這學期真的有課排在那天才多一欄
  const days = [...WEEKDAYS, ...['S', 'U'].filter((d) => placed.some((p) => p.slots.some((s) => s[0] === d)))];

  const head = `<tr><th class="tt-p"></th>${days.map((d) => `<th>${DAY_LABEL[d]}</th>`).join('')}</tr>`;
  const rows = PERIODS.map((per) => {
    const cells = days
      .map((d) => {
        const list = bySlot.get(d + per) || [];
        if (!list.length) return '<td></td>';
        return `<td class="${list.length > 1 ? 'clash' : ''}">${list.map((p) => blockHTML(p, tags, locked)).join('')}</td>`;
      })
      .join('');
    return `<tr class="${QUIET.has(per) ? 'quiet' : ''}"><th class="tt-p">${per}</th>${cells}</tr>`;
  }).join('');

  return `<table class="tt"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function blockHTML({ course, section, slots }, tags, locked) {
  const tag = tags.find((t) => t.id === course.tag);
  const color = tag ? tag.color : 'var(--grey)';
  const rooms = [...new Set(section.meetings.map((m) => m.room).filter(Boolean))].join('、');
  const title = [
    course.name,
    section.custom ? '自訂時段' : `${section.no}　${(section.teachers || []).join('、')}`,
    `${sortSlots(slots).join(' ')}${rooms ? '　' + rooms : ''}`,
    section.reference ? `時段參考 ${section.sourceTerm}` : '',
    locked ? '' : '點一下可以換班或改時段',
  ]
    .filter(Boolean)
    .join('\n');
  return `<div class="tt-block${getSelectedId() === course.id ? ' selected' : ''}"
               draggable="${locked ? 'false' : 'true'}" data-id="${esc(course.id)}" data-pick="${esc(course.id)}"
               style="--tag:${esc(color)}" title="${esc(title)}">${esc(course.name)}</div>`;
}

function unplacedTray(unplaced, tags, locked, term, total) {
  if (!total) return `<div class="drop-hint wk-empty">${locked ? '已鎖定' : '拖曳課程到這裡'}</div>`;
  if (!unplaced.length) return '';
  const hasData = term && sourcesFor(OFFERINGS, term).length > 0;

  const items = unplaced
    .map(({ course, section }) => {
      let label;
      if (section) label = '沒有固定時段';
      else if (!hasData) label = '沒有開課資料・自訂時段';
      else {
        const n = sectionCandidates(OFFERINGS, term, { name: course.name }).length;
        label = n ? `選班 · ${n} 班` : '找不到同名課程・自訂時段';
      }
      // 沒有開課資料也能打開視窗：裡面可以自己點選上課節次
      const action = locked
        ? `<span class="wk-pick-note">${esc(label)}</span>`
        : `<button class="wk-pick" data-pick="${esc(course.id)}" type="button">${esc(label)}</button>`;
      return `<div class="wk-unplaced">${chipHTML(course, tags, 'grid', locked)}${action}</div>`;
    })
    .join('');

  return `<div class="wk-tray"><div class="wk-tray-label">未定時段</div>${items}</div>`;
}

/* ── 事件（委派在容器上，重畫不用重綁）────── */
function bindEvents(box) {
  bound = true;

  box.addEventListener('click', (e) => {
    const lock = e.target.closest('[data-lock]');
    if (lock) {
      e.stopPropagation();
      return toast(store.toggleSemesterLock(lock.dataset.lock) ? '已鎖定，這個學期不能編輯' : '已解鎖，可以繼續編輯');
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) return openSectionPicker(pick.dataset.pick);

    /* 先點待排課程、再點學期卡片：跟列表模式一樣把課放進來 */
    if (e.target.closest('.chip, button, select')) return;
    const card = e.target.closest('.wk-card');
    const id = getSelectedId();
    if (!card || !id) return;
    if (store.isSemesterLocked(card.dataset.sem)) return toast('這個學期已鎖定，請先解鎖');
    clearSelection();
    store.assign(id, card.dataset.sem);
  });

  /* 格子裡的課：拖的是整門課，不管抓的是它的哪一節 */
  box.addEventListener('dragstart', (e) => {
    const block = e.target.closest('.tt-block');
    if (!block || block.closest('.sem-card.locked')) return;
    e.dataTransfer.setData('text/plain', block.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    box.querySelectorAll(`.tt-block[data-id="${CSS.escape(block.dataset.id)}"]`).forEach((b) => b.classList.add('dragging'));
  });
  box.addEventListener('dragend', () => box.querySelectorAll('.tt-block.dragging').forEach((b) => b.classList.remove('dragging')));

  /* 放到任何一張學期卡片上＝排進那個學期 */
  box.addEventListener('dragover', (e) => {
    const card = e.target.closest('.wk-card');
    if (!card || store.isSemesterLocked(card.dataset.sem)) return;
    e.preventDefault();
    card.classList.add('drag-over');
  });
  box.addEventListener('dragleave', (e) => {
    const card = e.target.closest('.wk-card');
    if (card && !card.contains(e.relatedTarget)) card.classList.remove('drag-over');
  });
  box.addEventListener('drop', (e) => {
    const card = e.target.closest('.wk-card');
    if (!card) return;
    e.preventDefault();
    card.classList.remove('drag-over');
    if (store.isSemesterLocked(card.dataset.sem)) return toast('這個學期已鎖定，請先解鎖');
    store.assign(e.dataTransfer.getData('text/plain'), card.dataset.sem);
  });
}
