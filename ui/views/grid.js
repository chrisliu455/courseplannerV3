/**
 * ui/views/grid.js — 四年八學期課表
 *
 * 兩種排課方式：拖曳，或先點卡片再點學期格子（手機上比較好用）。
 */

import { store } from '../store.js';
import { $, esc, num } from '../dom.js';
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
    return `
      <div class="sem-card">
        <div class="sem-head">
          <h3>${esc(sem.year)} ${esc(sem.term)}</h3>
          <span class="credit-badge">${num(credits)} 學分</span>
        </div>
        <div class="sem-body" data-sem="${esc(sem.id)}">
          ${
            list.length
              ? list.map((c) => chipHTML(c, tags)).join('')
              : '<div class="drop-hint">拖曳課程到這裡</div>'
          }
        </div>
      </div>`;
  }).join('');

  if (!bound) bindEvents();
}

function bindEvents() {
  bound = true;
  const grid = $('#semesterGrid');

  grid.addEventListener('dragover', (e) => {
    const body = e.target.closest('.sem-body');
    if (!body) return;
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
    store.assign(e.dataTransfer.getData('text/plain'), body.dataset.sem);
  });

  /* 點選格子 = 把目前選取的卡片放進來 */
  grid.addEventListener('click', (e) => {
    if (e.target.closest('.chip')) return; // 點卡片本身交給 pool.js 處理選取
    const body = e.target.closest('.sem-body');
    const id = getSelectedId();
    if (!body || !id) return;
    clearSelection();
    store.assign(id, body.dataset.sem);
  });
}
