/**
 * ui/views/tags.js — 標籤設定
 *
 * 可以改標籤名稱、顏色，以及最重要的：改這個標籤要算進哪個項目。
 * 改動存在 plan.tagEdits，原始規則集不會被動到，匯出檔案時一起帶走。
 */

import { store } from '../store.js';
import { $, esc, num, toast } from '../dom.js';
import { tagTable, applyTagEdits, buildIndex } from '../../engine/index.js';

export function openTagEditor() {
  const { plan, ruleset } = store;
  const merged = applyTagEdits(ruleset, plan.tagEdits);
  const index = buildIndex(merged, plan.options);
  const tags = tagTable(plan, ruleset);

  const buckets = [];
  merged.categories.forEach((cat) =>
    cat.buckets.forEach((b) => buckets.push({ id: b.id, label: `${cat.label} › ${b.label}` }))
  );

  const usage = new Map();
  plan.courses.forEach((c) => c.tag && usage.set(c.tag, (usage.get(c.tag) || 0) + 1));
  const customIds = new Set(plan.tagEdits.custom.map((t) => t.id));

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="標籤設定">
      <h3>標籤設定</h3>
      <p class="sub">一門課只掛一個標籤，標籤決定學分算進哪個項目、哪個大類。改「歸屬項目」就會改變學分的落點，右側判定結果會立刻重算。</p>
      <table class="tag-table">
        <thead>
          <tr><th>標籤</th><th style="width:44px">顏色</th><th>歸屬項目（大類 › 項目）</th><th style="width:56px">使用</th><th style="width:32px"></th></tr>
        </thead>
        <tbody>
          ${tags
            .map(
              (t) => `
            <tr data-tag="${esc(t.id)}">
              <td><input type="text" class="t-label" value="${esc(t.label)}"></td>
              <td><input type="color" class="t-color" value="${esc(t.color || '#6B6558')}"></td>
              <td>
                <select class="t-bucket" style="width:100%">
                  <option value="">— 不歸屬（不計學分）—</option>
                  ${buckets
                    .map(
                      (b) =>
                        `<option value="${esc(b.id)}" ${b.id === t.bucketId ? 'selected' : ''}>${esc(
                          b.label
                        )}</option>`
                    )
                    .join('')}
                </select>
              </td>
              <td class="count">${usage.get(t.id) || 0} 門</td>
              <td>${customIds.has(t.id) ? '<button class="del-x t-del" type="button" title="刪除自訂標籤">×</button>' : ''}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>

      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--hairline)">
        <label style="margin-top:0">新增自訂標籤</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" id="newTagLabel" placeholder="標籤名稱，例：校外實習" style="flex:1">
          <select id="newTagBucket" style="flex:1.2">
            ${buckets.map((b) => `<option value="${esc(b.id)}">${esc(b.label)}</option>`).join('')}
          </select>
          <button class="btn-ghost btn-small" id="newTagBtn" type="button" style="white-space:nowrap">＋ 新增</button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost btn-small" id="tagReset" type="button">還原所有標籤設定</button>
        <span class="spacer"></span>
        <button class="btn-ghost" id="tagClose" type="button">完成</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => e.target === overlay && close());
  overlay.querySelector('#tagClose').addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  });

  overlay.addEventListener('change', (e) => {
    const row = e.target.closest('tr[data-tag]');
    if (!row) return;
    const id = row.dataset.tag;
    if (e.target.classList.contains('t-label')) store.editTag(id, { label: e.target.value.trim() });
    if (e.target.classList.contains('t-color')) store.editTag(id, { color: e.target.value });
    if (e.target.classList.contains('t-bucket')) {
      store.moveTag(id, e.target.value || '__none__');
      toast('學分歸屬已更新');
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target.closest('.t-del')) {
      const id = e.target.closest('tr[data-tag]').dataset.tag;
      const used = usage.get(id) || 0;
      if (used && !confirm(`有 ${used} 門課使用這個標籤，刪除後它們會變成未設標籤。確定刪除？`)) return;
      store.removeCustomTag(id);
      close();
      openTagEditor();
    }
  });

  overlay.querySelector('#newTagBtn').addEventListener('click', () => {
    const label = overlay.querySelector('#newTagLabel').value.trim();
    if (!label) return toast('請先輸入標籤名稱');
    store.addCustomTag({
      id: 'tag.custom.' + Date.now().toString(36),
      label,
      color: '#6B6558',
      bucket: overlay.querySelector('#newTagBucket').value,
    });
    close();
    openTagEditor();
  });

  overlay.querySelector('#tagReset').addEventListener('click', () => {
    if (!confirm('會把標籤名稱、顏色、歸屬項目全部還原成規則集的預設值，自訂標籤也會刪除。確定？')) return;
    store.resetTagEdits();
    close();
    openTagEditor();
  });
}
