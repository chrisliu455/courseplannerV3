/**
 * ui/views/setup.js — 修業設定 ＋ 規定科目匯入
 *
 * 匯入清單直接從規則集的 subjectGroups 長出來，
 * 每門課會自動帶上規則建議的標籤，不用一門一門手選。
 */

import { store } from '../store.js';
import { $, esc, num, toast, delegate } from '../dom.js';
import { RULESETS } from '../../rulesets/index.js';
import { isActive } from '../../engine/index.js';

let bound = false;

export function renderSetup() {
  const { plan, ruleset } = store;

  /* 規則集 + 選項 */
  $('#setupBox').innerHTML = `
    <label for="rulesetSelect">適用規則</label>
    <select id="rulesetSelect">
      ${RULESETS.map(
        (r) => `<option value="${esc(r.id)}" ${r.id === plan.rulesetId ? 'selected' : ''}>${esc(r.label)}</option>`
      ).join('')}
    </select>
    <p class="footnote" style="margin-top:6px">畢業總學分 ${num(ruleset.totalCredits)}｜依 ${esc(ruleset.source || '學校公告')}</p>

    <label for="studentName">姓名／學號（選填）</label>
    <input type="text" id="studentName" value="${esc(plan.meta.studentName)}" placeholder="只存在這台裝置">

    ${(ruleset.options || [])
      .map(
        (opt) => `
      <label for="opt-${esc(opt.id)}">${esc(opt.label)}</label>
      <select id="opt-${esc(opt.id)}" data-option="${esc(opt.id)}">
        ${opt.choices
          .map(
            (ch) =>
              `<option value="${esc(ch.value)}" ${
                (plan.options[opt.id] || '') === ch.value ? 'selected' : ''
              }>${esc(ch.label)}</option>`
          )
          .join('')}
      </select>`
      )
      .join('')}
  `;

  renderImportPanel();

  if (!bound) bindEvents();
}

/* ── 規定科目匯入 ─────────────────────────── */
function renderImportPanel() {
  const { plan, ruleset } = store;
  const groups = (ruleset.subjectGroups || []).filter((g) => isActive(g, plan.options));

  const rows = groups
    .map((g) => renderGroup(g, plan.options))
    .filter(Boolean)
    .join('');

  $('#importBox').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="footnote" style="margin:0">勾選後加入，標籤自動帶入</span>
      <button class="link-btn" id="importToggleAll" type="button">全選 / 取消</button>
    </div>
    <div id="importList" style="max-height:300px;overflow-y:auto;border:1px solid var(--hairline);background:#fff;border-radius:2px">
      ${rows || '<p class="empty-note" style="padding:10px">這份規則集沒有列出規定科目。</p>'}
    </div>
    <button class="btn-primary" id="importAddBtn" type="button">＋ 加入勾選的課程</button>
  `;
}

function renderGroup(group, options, depth = 0) {
  const children = (group.groups || []).filter((g) => isActive(g, options));
  const items = group.items || [];
  if (!children.length && !items.length) return '';

  const head = `<div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;color:var(--ink-soft);background:var(--paper-dark);padding:5px 10px;padding-left:${
    10 + depth * 10
  }px;position:sticky;top:0">${esc(group.label)}</div>`;

  const body = items
    .map((item) => {
      const exists = store.hasCourse(item.name);
      return `
      <label style="display:flex;gap:8px;align-items:flex-start;padding:6px 10px;border-bottom:1px solid var(--hairline);font-size:12.5px;cursor:${
        exists ? 'default' : 'pointer'
      };${exists ? 'opacity:.5' : ''}">
        <input type="checkbox" style="width:auto;margin-top:2px"
               data-name="${esc(item.name)}" data-credit="${item.credit}" data-tag="${esc(item.tag || '')}"
               ${exists ? 'checked disabled' : ''}>
        <span style="flex:1;line-height:1.35">${esc(item.name)}${
        item.note ? `<span style="display:block;font-size:10.5px;color:var(--ink-soft);font-style:italic">${esc(item.note)}</span>` : ''
      }</span>
        <span class="mono" style="font-size:11px;color:var(--ink-soft)">${num(item.credit)}</span>
      </label>`;
    })
    .join('');

  const subs = children.map((g) => renderGroup(g, options, depth + 1)).join('');
  return head + body + subs;
}

/* ── 事件 ─────────────────────────────────── */
function bindEvents() {
  bound = true;

  const setup = $('#setupBox');
  setup.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'rulesetSelect') return store.setRuleset(t.value);
    if (t.dataset.option) return store.setOption(t.dataset.option, t.value);
  });
  setup.addEventListener('input', (e) => {
    if (e.target.id === 'studentName') store.setMeta('studentName', e.target.value);
  });

  const box = $('#importBox');
  delegate(box, 'click', '#importToggleAll', () => {
    const boxes = [...box.querySelectorAll('input[type=checkbox]:not(:disabled)')];
    const allOn = boxes.every((b) => b.checked);
    boxes.forEach((b) => (b.checked = !allOn));
  });

  delegate(box, 'click', '#importAddBtn', () => {
    const picked = [...box.querySelectorAll('input[type=checkbox]:checked:not(:disabled)')];
    if (!picked.length) return toast('先勾選要加入的課程');
    store.addCourses(
      picked.map((b) => ({
        name: b.dataset.name,
        credit: Number(b.dataset.credit),
        tag: b.dataset.tag || null,
      }))
    );
    toast(`已加入 ${picked.length} 門課到待排清單`);
  });
}
