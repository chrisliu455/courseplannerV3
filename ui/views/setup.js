/**
 * ui/views/setup.js — 身分別設定 ＋ 規定科目匯入
 *
 * 畢業學分要求由身分別相加而來：主修動機系 129 ＋ 輔系計財 20 ＝ 149。
 * 匯入清單直接從合併後的規則集長出來，每門課自動帶上規則建議的標籤。
 */

import { store } from '../store.js';
import { $, esc, num, toast, delegate } from '../dom.js';
import { MAJORS, IDENTITIES } from '../../rulesets/index.js';
import { isActive, typeLabel } from '../../engine/index.js';

let bound = false;

export function renderSetup() {
  const { plan, ruleset } = store;
  const major = MAJORS.find((m) => m.id === plan.majorId);

  /* 已加入的額外身分（內建 ＋ 自訂） */
  const extras = [
    ...plan.identityIds
      .map((id) => IDENTITIES.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => ({ id: m.id, type: m.type, label: m.label, credits: m.totalCredits, builtin: true })),
    ...plan.customIdentities.map((c) => ({ ...c, builtin: false })),
  ];

  /* 還沒加入的內建身分 */
  const available = IDENTITIES.filter((m) => !plan.identityIds.includes(m.id));

  $('#setupBox').innerHTML = `
    <label for="majorSelect">主修</label>
    <select id="majorSelect">
      ${MAJORS.map(
        (m) =>
          `<option value="${esc(m.id)}" ${m.id === plan.majorId ? 'selected' : ''}>${esc(m.label)}${
            m.admissionYear ? `　${m.admissionYear} 學年入學` : ''
          }</option>`
      ).join('')}
    </select>

    <label>額外身分</label>
    ${
      extras.length
        ? extras
            .map(
              (e) => `
      <div class="identity-item">
        <span class="badge type-${esc(e.type)}">${esc(typeLabel(e.type))}</span>
        <span class="nm">${esc(e.label)}</span>
        <span class="mono cr">＋${num(e.credits)}</span>
        <button class="del-x" data-remove-identity="${esc(e.id)}" title="移除這個身分" type="button">×</button>
      </div>`
            )
            .join('')
        : '<p class="empty-note" style="padding:2px">尚未加入。只算主修的畢業學分。</p>'
    }

    <div class="identity-add">
      <select id="identityPick">
        ${
          available.length
            ? available
                .map(
                  (m) =>
                    `<option value="${esc(m.id)}">${esc(typeLabel(m.type))}：${esc(m.label)}（＋${num(
                      m.totalCredits
                    )}）</option>`
                )
                .join('')
            : '<option value="">— 內建身分都加完了 —</option>'
        }
      </select>
      <button class="btn-ghost btn-small" id="identityAddBtn" type="button" ${
        available.length ? '' : 'disabled'
      }>＋ 加入</button>
    </div>
    <button class="link-btn" id="identityCustomBtn" type="button" style="margin-top:8px">找不到？自訂一個身分</button>

    <div class="credit-sum">
      ${store.modules
        .map(
          (m) =>
            `<div class="cs-row"><span>${esc(typeLabel(m.type))}　${esc(m.label)}</span><span class="mono">${num(
              m.totalCredits
            )}</span></div>`
        )
        .join('')}
      <div class="cs-row total"><span>畢業應修學分</span><span class="mono">${num(ruleset.totalCredits)}</span></div>
    </div>

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

    ${major && major.source ? `<p class="footnote">依 ${esc(major.source)}</p>` : ''}
  `;

  renderImportPanel();
  if (!bound) bindEvents();
}

/* ── 規定科目匯入 ─────────────────────────── */
function renderImportPanel() {
  const { plan, ruleset } = store;
  const groups = (ruleset.subjectGroups || []).filter((g) => isActive(g, plan.options));
  const rows = groups.map((g) => renderGroup(g, plan.options)).filter(Boolean).join('');

  $('#importBox').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="footnote" style="margin:0">勾選後加入，標籤自動帶入</span>
      <button class="link-btn" id="importToggleAll" type="button">全選 / 取消</button>
    </div>
    <div id="importList" style="max-height:300px;overflow-y:auto;border:1px solid var(--hairline);background:#fff;border-radius:2px">
      ${rows || '<p class="empty-note" style="padding:10px">這些身分沒有列出規定科目。</p>'}
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

  return head + body + children.map((g) => renderGroup(g, options, depth + 1)).join('');
}

/* ── 事件 ─────────────────────────────────── */
function bindEvents() {
  bound = true;
  const setup = $('#setupBox');

  setup.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'majorSelect') return store.setMajor(t.value);
    if (t.dataset.option) return store.setOption(t.dataset.option, t.value);
  });
  setup.addEventListener('input', (e) => {
    if (e.target.id === 'studentName') store.setMeta('studentName', e.target.value);
  });

  delegate(setup, 'click', '#identityAddBtn', () => {
    const id = $('#identityPick').value;
    if (!id) return;
    if (store.addIdentity(id)) toast('已加入身分，畢業學分要求已更新');
  });

  delegate(setup, 'click', '[data-remove-identity]', (e, btn) => {
    const id = btn.dataset.removeIdentity;
    const n = store.identityCourseCount(id);
    if (n && !confirm(`有 ${n} 門課掛著這個身分的標籤，移除後它們會變成未設標籤（課程本身不會被刪除）。確定移除？`)) return;
    store.removeIdentity(id);
    toast('已移除身分');
  });

  delegate(setup, 'click', '#identityCustomBtn', openCustomDialog);

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
      picked.map((b) => ({ name: b.dataset.name, credit: Number(b.dataset.credit), tag: b.dataset.tag || null }))
    );
    toast(`已加入 ${picked.length} 門課到待排清單`);
  });
}

/* ── 自訂身分 ─────────────────────────────── */
function openCustomDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="自訂身分" style="width:min(420px,100%)">
      <h3>自訂身分</h3>
      <p class="sub">系統沒有內建的輔系、雙主修或學分學程，可以自己加。加入後會自動產生一個專屬標籤，學分要求疊加到畢業總學分上。</p>
      <label for="ciType">類別</label>
      <select id="ciType">
        <option value="minor">輔系</option>
        <option value="doubleMajor">雙主修</option>
        <option value="program">學分學程</option>
      </select>
      <label for="ciLabel">名稱</label>
      <input type="text" id="ciLabel" placeholder="例：資訊工程學系">
      <label for="ciCredits">應加修學分</label>
      <input type="number" id="ciCredits" min="0" step="1" value="20">
      <div class="modal-actions">
        <span class="spacer"></span>
        <button class="btn-ghost" id="ciCancel" type="button">取消</button>
        <button class="btn-primary" id="ciSave" type="button" style="width:auto;margin:0">加入</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => e.target === overlay && close());
  overlay.querySelector('#ciCancel').addEventListener('click', close);
  overlay.querySelector('#ciLabel').focus();

  overlay.querySelector('#ciSave').addEventListener('click', () => {
    const label = overlay.querySelector('#ciLabel').value.trim();
    if (!label) return toast('請先輸入名稱');
    store.addCustomIdentity({
      type: overlay.querySelector('#ciType').value,
      label,
      credits: overlay.querySelector('#ciCredits').value,
    });
    close();
    toast('已加入身分，畢業學分要求已更新');
  });
}
