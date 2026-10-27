/**
 * ui/views/course-suggest.js — 新增課程的課名建議
 *
 * 在「課程名稱」欄位打字時，從開課資料（offerings/）找出符合的課列在下方，
 * 選一門就自動填好課名與學分，課程類別仍由使用者自己選。
 * 搜尋規則在 engine/schedule.js 的 searchOfferings()，這裡只管畫面與操作：
 *   滑鼠點選、↑↓ 移動、Enter 選定、Esc 或離開欄位關閉。
 *
 * 表單會被 pool.js 整個重畫，所以事件一律委派在外層容器上，只綁一次。
 */

import { $, esc, num } from '../dom.js';
import { searchOfferings } from '../../engine/index.js';
import { OFFERINGS } from '../../offerings/index.js';

let results = [];
let active = -1; // 目前用鍵盤停在第幾筆，-1＝沒有

export function attachCourseSuggest(box) {
  box.addEventListener('input', (e) => {
    if (e.target.id === 'courseName') update(box, e.target);
  });

  /* 用捕獲階段（第三個參數 true）：比 pool.js 的 Enter＝加入課程 更早收到按鍵，
     清單開著時按 Enter 是「選這門」，不會直接把打到一半的課名加進去 */
  box.addEventListener(
    'keydown',
    (e) => {
      if (e.target.id !== 'courseName' || !results.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        active = (active + step + results.length) % results.length;
        draw(box, e.target);
      } else if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        e.stopPropagation();
        pick(box, results[active]);
      } else if (e.key === 'Escape') {
        close(box);
      }
    },
    true
  );

  /* 用 mousedown 而不是 click：click 發生前欄位就失焦、清單已經關掉了 */
  box.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.suggest-item');
    if (!item) return;
    e.preventDefault();
    pick(box, results[Number(item.dataset.i)]);
  });

  box.addEventListener('focusout', (e) => {
    if (e.target.id === 'courseName') close(box);
  });
}

function update(box, input) {
  results = searchOfferings(OFFERINGS, input.value);
  active = -1;
  draw(box, input);
}

function draw(box, input) {
  let list = $('.suggest-list', box);
  if (!results.length) return list?.remove();
  if (!list) {
    list = document.createElement('ul');
    list.className = 'suggest-list';
    list.setAttribute('role', 'listbox');
    box.appendChild(list);
  }
  list.style.top = `${input.offsetTop + input.offsetHeight + 4}px`;
  list.innerHTML = results
    .map(
      (r, i) => `
      <li class="suggest-item${i === active ? ' active' : ''}" data-i="${i}" role="option" aria-selected="${i === active}">
        <span class="suggest-name">${esc(r.name)}</span>
        <span class="suggest-meta">${num(r.credit)} 學分・${esc(r.depts.join('、'))}・${esc(r.terms.join(' / '))}・${r.sections} 個班</span>
      </li>`
    )
    .join('');
  list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
}

function pick(box, r) {
  if (!r) return;
  $('#courseName', box).value = r.name;
  $('#courseCredit', box).value = r.credit;
  close(box);
  $('#courseGroup', box)?.focus(); // 下一步：選課程類別
}

function close(box) {
  results = [];
  active = -1;
  $('.suggest-list', box)?.remove();
}
