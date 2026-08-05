/**
 * ui/views/pool.js — 新增課程 ＋ 待排課程池
 *
 * 每張課程卡上都有標籤下拉選單，直接在卡片上改標籤，
 * 改完引擎馬上重算。這就是「要可編輯標籤」最常用到的地方。
 */

import { store } from '../store.js';
import { $, esc, num, toast, delegate } from '../dom.js';
import { tagTable } from '../../engine/index.js';

let bound = false;
let selectedId = null;
let keyword = '';

export function getSelectedId() {
  return selectedId;
}
export function clearSelection() {
  selectedId = null;
}

export function renderPool() {
  const { plan, ruleset } = store;
  const tags = tagTable(plan, ruleset);

  /* 新增課程表單（保留使用者已輸入的內容） */
  const form = $('#addCourseBox');
  const keep = {
    name: form.querySelector('#courseName')?.value || '',
    credit: form.querySelector('#courseCredit')?.value || '',
    tag: form.querySelector('#courseTag')?.value || '',
  };
  form.innerHTML = `
    <label for="courseName">課程名稱</label>
    <input type="text" id="courseName" placeholder="例：資料結構" value="${esc(keep.name)}">
    <div class="row2">
      <div>
        <label for="courseCredit">學分</label>
        <input type="number" id="courseCredit" min="0" step="0.5" placeholder="3" value="${esc(keep.credit)}">
      </div>
      <div>
        <label for="courseTag">標籤</label>
        <select id="courseTag">${tagOptions(tags, keep.tag)}</select>
      </div>
    </div>
    <button class="btn-primary" id="addCourseBtn" type="button">＋ 加入待排清單</button>
  `;

  /* 課程池 */
  const pool = plan.courses.filter((c) => !c.semester);
  const kw = keyword.trim().toLowerCase();
  const shown = kw ? pool.filter((c) => c.name.toLowerCase().includes(kw)) : pool;

  $('#poolCount').textContent = pool.length ? `${pool.length} 門待排` : '';
  $('#poolContainer').innerHTML = shown.length
    ? shown.map((c) => chipHTML(c, tags)).join('')
    : `<p class="empty-note">${pool.length ? '沒有符合搜尋的課程。' : '待排清單是空的。從上方匯入規定科目，或自行新增一門課。'}</p>`;

  if (!bound) bindEvents();
}

/**
 * 課程卡。學期表與待排池共用，差別只在右上角那顆按鈕：
 *   待排池 → ×  刪除課程
 *   學期表 → ↩  移回待排池（不刪課）
 */
export function chipHTML(course, tags, context = 'pool') {
  const tag = tags.find((t) => t.id === course.tag);
  const color = tag ? tag.color : 'var(--grey)';
  const warn = !course.tag
    ? '未設標籤，不會計入任何學分'
    : !tag
    ? '標籤已不存在'
    : !tag.active
    ? `「${tag.categoryLabel}」在目前身分下未啟用`
    : '';

  return `
  <div class="chip${selectedId === course.id ? ' selected' : ''}" draggable="true"
       data-id="${course.id}" style="border-left-color:${esc(color)}">
    <div class="body">
      <div class="name">${esc(course.name)}</div>
      <div class="tag-line">
        <select class="tag-pick" data-id="${course.id}" title="更改標籤">${tagOptions(tags, course.tag)}</select>
        ${warn ? `<span class="warn-dot" title="${esc(warn)}">!</span>` : ''}
      </div>
    </div>
    <span class="credit">${num(course.credit)}</span>
    ${
      context === 'grid'
        ? `<button class="chip-btn unschedule" data-unschedule="${course.id}" title="移回待排清單" type="button">↩</button>`
        : `<button class="del-x" data-del="${course.id}" title="刪除課程" type="button">×</button>`
    }
  </div>`;
}

function tagOptions(tags, current) {
  return (
    `<option value="" ${!current ? 'selected' : ''}>— 未設標籤 —</option>` +
    tags
      .map(
        (t) =>
          `<option value="${esc(t.id)}" ${t.id === current ? 'selected' : ''}>${esc(t.label)}${
            t.active ? '' : '（未啟用）'
          }</option>`
      )
      .join('')
  );
}

/* ── 事件（委派在容器上，重畫不用重綁）────── */
function bindEvents() {
  bound = true;

  delegate($('#addCourseBox'), 'click', '#addCourseBtn', addCourse);
  $('#addCourseBox').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.id === 'courseName' || e.target.id === 'courseCredit')) addCourse();
  });

  $('#searchCourse').addEventListener('input', (e) => {
    keyword = e.target.value;
    renderPool();
  });

  /* 卡片互動：改標籤、刪除、選取、拖曳 —— 綁在 document 上一次搞定池子與課表 */
  document.addEventListener('change', (e) => {
    const sel = e.target.closest('.tag-pick');
    if (sel) store.updateCourse(sel.dataset.id, { tag: sel.value || null });
  });

  document.addEventListener('click', (e) => {
    const back = e.target.closest('[data-unschedule]');
    if (back) {
      e.stopPropagation();
      store.assign(back.dataset.unschedule, null);
      return toast('已移回待排清單');
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      if (selectedId === del.dataset.del) selectedId = null;
      return store.removeCourse(del.dataset.del);
    }
    const chip = e.target.closest('.chip');
    if (chip && !e.target.closest('select')) {
      selectedId = selectedId === chip.dataset.id ? null : chip.dataset.id;
      renderPool();
      document.dispatchEvent(new CustomEvent('chip:selected'));
    }
  });

  document.addEventListener('dragstart', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.dataTransfer.setData('text/plain', chip.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    chip.classList.add('dragging');
  });
  document.addEventListener('dragend', (e) => {
    e.target.closest('.chip')?.classList.remove('dragging');
  });

  /* 拖回池子 = 取消排課 */
  const zone = $('#poolZone');
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    store.assign(e.dataTransfer.getData('text/plain'), null);
  });
}

function addCourse() {
  const name = $('#courseName').value.trim();
  const credit = $('#courseCredit').value;
  const tag = $('#courseTag').value;
  if (!name) return toast('請先填課程名稱');

  store.addCourse({ name, credit, tag: tag || null });
  $('#courseName').value = '';
  $('#courseCredit').value = '';
  $('#courseName').focus();
}
