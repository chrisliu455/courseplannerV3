/**
 * ui/views/pool.js — 新增課程 ＋ 待排課程池
 *
 * 標籤選擇分兩層：先選課程類別（＝學分項目），需要細分時才問第二個問題。
 * 例如「通識」底下有核心向度一～四與一般通識，選了通識才會出現第二個下拉。
 * 分組是從規則集的 bucket 結構自動長出來的，不是寫死通識。
 *
 * 課程卡上的標籤選單則用 optgroup 呈現同樣的層次，維持卡片精簡。
 */

import { store } from '../store.js';
import { $, esc, num, toast, delegate } from '../dom.js';
import { tagTable } from '../../engine/index.js';
import { attachCourseSuggest } from './course-suggest.js';

let bound = false;
let selectedId = null;
let keyword = '';

/** 備註字數上限。卡片在窄格子裡也要放得下，所以刻意壓短。 */
const NOTE_MAX = 40;

/** 學期提醒的文字，例「開課資料中只見於上學期（115-1）」 */
function termHintText(hint) {
  return `開課資料中只見於${hint.term === 1 ? '上' : '下'}學期（${hint.terms.join('、')}）`;
}

/**
 * 課排進學期之後呼叫：排到開課資料裡沒開過的學期（上／下學期）就跳出提示。
 * moved 是 store.assign 的回傳值，沒有真的搬動時不提示。
 */
export function warnTermAfterAssign(moved, id) {
  if (!moved) return;
  const course = store.plan.courses.find((c) => c.id === id);
  const hint = store.termHintOf(course);
  if (hint) toast(`注意：${course.name} ${termHintText(hint)}，這學期可能沒開`);
}

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
  const groups = buildGroups(tags);
  const keep = {
    name: form.querySelector('#courseName')?.value || '',
    credit: form.querySelector('#courseCredit')?.value || '',
    group: form.querySelector('#courseGroup')?.value ?? '',
    tag: form.querySelector('#courseTag')?.value || '',
  };

  const group = groups.find((g) => g.id === keep.group) || null;
  const needsDetail = group && group.tags.length > 1;
  const detailValue = group && group.tags.some((t) => t.id === keep.tag) ? keep.tag : group?.tags[0].id;

  form.innerHTML = `
    <label for="courseName">課程名稱</label>
    <input type="text" id="courseName" placeholder="例：資料結構" value="${esc(keep.name)}">
    <div class="row2">
      <div>
        <label for="courseCredit">學分數</label>
        <input type="number" id="courseCredit" min="0" step="0.5" placeholder="3" value="${esc(keep.credit)}">
      </div>
      <div>
        <label for="courseGroup">課程類別</label>
        <select id="courseGroup">
          <option value="" ${!group ? 'selected' : ''}>— 未設定 —</option>
          ${groups
            .map(
              (g) =>
                `<option value="${esc(g.id)}" ${g.id === keep.group ? 'selected' : ''}>${esc(g.label)}${
                  g.active ? '' : '（未啟用）'
                }</option>`
            )
            .join('')}
        </select>
      </div>
    </div>
    ${
      needsDetail
        ? `<label for="courseTag">這門${esc(group.label)}屬於哪一項？</label>
           <select id="courseTag" class="detail-pick">
             ${group.tags
               .map(
                 (t) =>
                   `<option value="${esc(t.id)}" ${t.id === detailValue ? 'selected' : ''}>${esc(t.label)}</option>`
               )
               .join('')}
           </select>`
        : `<input type="hidden" id="courseTag" value="${esc(group ? group.tags[0].id : '')}">`
    }
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
 *
 * locked＝這張卡在已鎖定的學期裡：不能拖、不能改標籤、不能改備註、不能移回待排。
 */
export function chipHTML(course, tags, context = 'pool', locked = false) {
  const tag = tags.find((t) => t.id === course.tag);
  const color = tag ? tag.color : 'var(--grey)';
  const warn = !course.tag
    ? '未設標籤，不會計入任何學分'
    : !tag
    ? '標籤已不存在'
    : !tag.active
    ? `「${tag.categoryLabel}」在目前身分下未啟用`
    : '';
  const note = (course.note || '').trim();
  const hint = store.termHintOf(course);

  return `
  <div class="chip${selectedId === course.id ? ' selected' : ''}${locked ? ' locked' : ''}"
       draggable="${locked ? 'false' : 'true'}"
       data-id="${course.id}" style="--tag:${esc(color)}">
    <div class="body">
      <div class="name-line">
        <div class="name">${esc(course.name)}</div>
        ${note ? `<div class="note-line" title="${esc(note)}">${esc(note)}</div>` : ''}
      </div>
      ${hint ? `<div class="term-hint">${esc(termHintText(hint))}</div>` : ''}
      <div class="tag-line">
        <select class="tag-pick" data-id="${course.id}" title="${locked ? '學期已鎖定，無法更改' : '更改標籤'}"
                ${locked ? 'disabled' : ''}>${tagOptions(tags, course.tag)}</select>
        ${warn ? `<span class="warn-dot" title="${esc(warn)}">!</span>` : ''}
        ${
          locked
            ? ''
            : `<button class="note-btn${note ? ' on' : ''}" data-note="${course.id}" type="button"
                title="${note ? '編輯備註' : '加備註'}">✎</button>`
        }
      </div>
    </div>
    <span class="credit">${num(course.credit)}</span>
    ${
      locked
        ? ''
        : context === 'grid'
        ? `<button class="chip-btn unschedule" data-unschedule="${course.id}" title="移回待排清單" type="button">↩</button>`
        : `<button class="del-x" data-del="${course.id}" title="刪除課程" type="button">×</button>`
    }
  </div>`;
}

/**
 * 把標籤依所屬項目分組。同一個項目底下有多個標籤時（例：通識的四個向度），
 * 新增課程表單才會問第二個問題。分組完全由規則集決定。
 */
function buildGroups(tags) {
  const groups = [];
  tags.forEach((t) => {
    const id = t.bucketId || '__none__';
    let g = groups.find((x) => x.id === id);
    if (!g) {
      g = { id, label: t.bucketLabel || '未歸屬', category: t.categoryLabel || '', active: t.active, tags: [] };
      groups.push(g);
    }
    g.tags.push(t);
  });
  return groups;
}

/** 卡片上的單一下拉：用 optgroup 表現同樣的層次，但不佔兩行 */
function tagOptions(tags, current) {
  const groups = buildGroups(tags);
  const opt = (t) =>
    `<option value="${esc(t.id)}" ${t.id === current ? 'selected' : ''}>${esc(t.label)}${
      t.active ? '' : '（未啟用）'
    }</option>`;

  return (
    `<option value="" ${!current ? 'selected' : ''}>— 未設標籤 —</option>` +
    groups
      .map((g) =>
        g.tags.length > 1
          ? `<optgroup label="${esc(g.label)}">${g.tags.map(opt).join('')}</optgroup>`
          : opt(g.tags[0])
      )
      .join('')
  );
}

/**
 * 在卡片內就地展開備註輸入框。
 *
 * 直接操作 DOM、不走重畫，這樣打字時不會被重畫打斷。
 * 存檔時呼叫 store.updateCourse，重畫由 store 自己觸發。
 */
function openNoteEditor(chip) {
  if (!chip || chip.querySelector('.note-edit')) return;
  const id = chip.dataset.id;
  const course = store.plan.courses.find((c) => c.id === id);
  if (!course) return;

  const body = chip.querySelector('.body');
  const line = body.querySelector('.note-line');
  if (line) line.hidden = true; // 編輯時先收起摘要那一行，免得同一段字出現兩次

  const box = document.createElement('div');
  box.className = 'note-edit';
  box.innerHTML = `
    <textarea rows="2" maxlength="${NOTE_MAX}" placeholder="例：跟林老師修"></textarea>
    <span class="note-count"></span>`;
  body.appendChild(box);

  const ta = box.querySelector('textarea');
  const count = box.querySelector('.note-count');
  ta.value = course.note || '';

  /* 卡片本身可拖曳，編輯時要先關掉，否則在輸入框裡拖曳選字會變成拖動整張卡 */
  chip.draggable = false;

  let closed = false;
  const close = (save) => {
    if (closed) return;
    closed = true;
    const next = ta.value.trim();
    box.remove();
    chip.draggable = true;
    if (save && next !== (course.note || '').trim()) store.updateCourse(id, { note: next });
    else if (line) line.hidden = false;
  };

  const sync = () => (count.textContent = `${ta.value.length}／${NOTE_MAX}`);
  sync();
  ta.addEventListener('input', sync);
  ta.addEventListener('blur', () => close(true));
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      close(true); // Enter 存檔，Shift+Enter 換行
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(false); // Esc 放棄這次修改
    }
  });

  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

/**
 * 這個元素是不是落在已鎖定的學期卡裡。
 *
 * closest() 會從自己開始往上找最近的符合祖先，找不到回傳 null；
 * 這裡用它把「鎖定」一次擋在所有卡片互動之前，不必每個按鈕各判斷一次。
 */
function inLockedSemester(el) {
  return Boolean(el?.closest?.('.sem-card.locked'));
}

/* ── 事件（委派在容器上，重畫不用重綁）────── */
function bindEvents() {
  bound = true;

  attachCourseSuggest($('#addCourseBox')); // 課名欄位打字時，從開課資料帶出建議

  delegate($('#addCourseBox'), 'click', '#addCourseBtn', addCourse);
  $('#addCourseBox').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.id === 'courseName' || e.target.id === 'courseCredit')) addCourse();
  });
  $('#addCourseBox').addEventListener('change', (e) => {
    if (e.target.id === 'courseGroup') renderPool(); // 換類別 → 重畫第二層
  });

  $('#searchCourse').addEventListener('input', (e) => {
    keyword = e.target.value;
    renderPool();
  });

  /* 卡片互動：改標籤、刪除、選取、拖曳 —— 綁在 document 上一次搞定池子與課表 */
  document.addEventListener('change', (e) => {
    if (inLockedSemester(e.target)) return;
    const sel = e.target.closest('.tag-pick');
    if (sel) store.updateCourse(sel.dataset.id, { tag: sel.value || null });
  });

  document.addEventListener('click', (e) => {
    /* 鎖住的學期：卡片上的互動一律忽略（鎖頭由 grid.js 自己的監聽器處理） */
    if (inLockedSemester(e.target)) return;

    /* 備註：點 ✎ 或已寫好的那行字都能開啟編輯，且不能讓事件繼續往下觸發卡片選取 */
    const noteHit = e.target.closest('[data-note], .note-line');
    if (noteHit) {
      e.stopPropagation();
      return openNoteEditor(noteHit.closest('.chip'));
    }
    if (e.target.closest('.note-edit')) return; // 點在輸入框裡：什麼都別做

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
    if (!chip || inLockedSemester(chip)) return;
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
