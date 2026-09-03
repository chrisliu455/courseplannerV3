/**
 * ui/views/grid.js — 四年八學期課表
 *
 * 兩種排課方式：拖曳，或先點卡片再點學期格子（手機上比較好用）。
 */

import { store } from '../store.js';
import { $, esc, num, toast } from '../dom.js';
import { SEMESTERS } from '../../rulesets/index.js';
import { tagTable } from '../../engine/index.js';
import { chipHTML, getSelectedId, clearSelection } from './pool.js';

let bound = false;

export function renderGrid() {
  const { plan, ruleset } = store;
  const tags = tagTable(plan, ruleset);

  $('#semesterGrid').innerHTML = SEMESTERS.map((sem) => {
    const list = plan.courses.filter((c) => c.semester === sem.id);
    const credits = list.reduce((s, c) => s + (Number(c.credit) || 0), 0);
    const locked = store.isSemesterLocked(sem.id);
    return `
      <div class="sem-card${locked ? ' locked' : ''}">
        <div class="sem-head">
          <h3>${esc(sem.year)} ${esc(sem.term)}</h3>
          <button class="lock-btn${locked ? ' on' : ''}" data-lock="${esc(sem.id)}" type="button"
                  aria-pressed="${locked}"
                  title="${locked ? '解鎖，恢復編輯' : '鎖住這個學期，避免誤動已排好的課'}">
            ${lockIcon(locked)}
          </button>
          <span class="spacer"></span>
          <span class="credit-badge">${num(credits)} 學分</span>
        </div>
        <div class="sem-body" data-sem="${esc(sem.id)}">
          ${
            list.length
              ? list.map((c) => chipHTML(c, tags, 'grid', locked)).join('')
              : `<div class="drop-hint">${locked ? '已鎖定' : '拖曳課程到這裡'}</div>`
          }
        </div>
      </div>`;
  }).join('');

  if (!bound) bindEvents();
}

/**
 * 鎖頭圖示。用內嵌 SVG 而不是 🔒 emoji：
 * emoji 的顏色由系統字型決定，CSS 的 color 管不到（只能用 filter 硬壓，各瀏覽器結果不一）。
 * SVG 裡寫 currentColor，就等於「跟著 CSS 的 color 走」，灰或黑完全由樣式表決定。
 */
function lockIcon(locked) {
  const shackle = locked
    ? 'M7 11 V7 a5 5 0 0 1 10 0 V11'   // 扣上：兩腳都落在鎖身上
    : 'M7 11 V7 a5 5 0 0 1 9.9 -1';    // 打開：右邊那腳翹起來、沒有扣回去
  return `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false">
      <path d="${shackle}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <rect x="3" y="11" width="18" height="11" rx="2" fill="currentColor"/>
    </svg>`;
}

function bindEvents() {
  bound = true;
  const grid = $('#semesterGrid');

  grid.addEventListener('dragover', (e) => {
    const body = e.target.closest('.sem-body');
    if (!body || store.isSemesterLocked(body.dataset.sem)) return; // 鎖住就不接受放下
    e.preventDefault();
    body.classList.add('drag-over');
  });
  grid.addEventListener('dragleave', (e) => {
    e.target.closest('.sem-body')?.classList.remove('drag-over');
  });
  grid.addEventListener('drop', (e) => {
    const body = e.target.closest('.sem-body');
    if (!body) return;
    e.preventDefault();
    body.classList.remove('drag-over');
    if (store.isSemesterLocked(body.dataset.sem)) return toast('這個學期已鎖定，請先解鎖');
    store.assign(e.dataTransfer.getData('text/plain'), body.dataset.sem);
  });

  /* 點鎖頭 = 切換該學期的鎖定狀態 */
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lock]');
    if (!btn) return;
    e.stopPropagation();
    const sem = btn.dataset.lock;
    toast(store.toggleSemesterLock(sem) ? '已鎖定，這個學期不能編輯' : '已解鎖，可以繼續編輯');
  });

  /* 點選格子 = 把目前選取的卡片放進來 */
  grid.addEventListener('click', (e) => {
    if (e.target.closest('.chip')) return; // 點卡片本身交給 pool.js 處理選取
    const body = e.target.closest('.sem-body');
    const id = getSelectedId();
    if (!body || !id) return;
    if (store.isSemesterLocked(body.dataset.sem)) return toast('這個學期已鎖定，請先解鎖');
    clearSelection();
    store.assign(id, body.dataset.sem);
  });
}
