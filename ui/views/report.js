/**
 * ui/views/report.js — 判定結果
 *
 * 這裡完全不算任何東西，只負責把引擎回傳的 report 畫出來。
 * 想改判定邏輯請去 engine/，改這裡只會改到外觀。
 */

import { $, esc, num, delegate } from '../dom.js';
import { SEMESTERS } from '../../rulesets/index.js';

let tab = 'credit';
let bound = false;

const semLabel = (id) => {
  const s = SEMESTERS.find((x) => x.id === id);
  return s ? `${s.year}${s.term}` : '';
};

export function renderReport(report) {
  const s = report.subject;
  const c = report.credit;

  $('#reportTabs').innerHTML = `
    <button data-tab="subject" aria-selected="${tab === 'subject'}" type="button">
      科目判定 <span class="flag">${s.totals.checked}/${s.totals.required}</span>
    </button>
    <button data-tab="credit" aria-selected="${tab === 'credit'}" type="button">
      學分判定 <span class="flag">${num(c.total.earned)}/${num(c.total.target)}</span>
    </button>
  `;

  $('#reportBody').innerHTML =
    (report.issues.length ? issuesHTML(report.issues) : '') +
    (tab === 'subject' ? subjectHTML(s) : creditHTML(c));

  if (!bound) {
    bound = true;
    delegate($('#reportTabs'), 'click', 'button[data-tab]', (e, btn) => {
      tab = btn.dataset.tab;
      document.dispatchEvent(new CustomEvent('report:refresh'));
    });
  }
}

/* ── 科目判定 ─────────────────────────────── */
function subjectHTML(s) {
  const banner = s.allSatisfied
    ? '<div class="notice pass"><b>規定科目全部排定。</b></div>'
    : `<div class="notice">還有 <b>${s.totals.required - s.totals.checked}</b> 門規定科目沒排進課表。已排 ${s.totals.checked}／${s.totals.required} 門。</div>`;

  return banner + s.groups.map(groupHTML).join('');
}

function groupHTML(g) {
  const done = g.satisfied && g.rawSatisfied;
  const items = g.items.length
    ? `<div class="subj-items">${g.items.map(itemHTML).join('')}</div>`
    : '';
  const subs = g.groups.length
    ? `<div class="subj-sub">${g.groups
        .map(
          (sub) => `
      <div class="subj-sub-head">
        <span>${sub.satisfied ? '✓' : '○'} ${esc(sub.label)}</span>
        <span class="status">${num(sub.have)} / ${num(sub.need)} ${esc(sub.unit)}</span>
      </div>
      <div class="subj-items" style="padding-left:0;padding-right:0">${sub.items.map(itemHTML).join('')}</div>`
        )
        .join('')}</div>`
    : '';

  return `
    <div class="subj-group">
      <div class="subj-head${done ? ' done' : ''}">
        <span>${done ? '✓' : '○'}</span>
        <span>${esc(g.label)}${g.note ? ` <span class="subj-note">${esc(g.note)}</span>` : ''}</span>
        <span class="status">${num(g.have)} / ${num(g.need)} ${esc(g.unit)}</span>
      </div>
      ${items}${subs}
    </div>`;
}

function itemHTML(i) {
  return `
    <div class="subj-item${i.checked ? ' checked' : ''}" title="${esc(i.note || '')}">
      <span class="mark">${i.checked ? '☑' : '☐'}</span>
      <span class="nm">${esc(i.name)}${
    i.tagMismatch ? ' <span class="mismatch" title="標籤與規則建議不同，學分可能算到別類">⚑</span>' : ''
  }</span>
      <span class="sem">${i.checked ? esc(semLabel(i.semester)) : num(i.credit)}</span>
    </div>`;
}

/* ── 學分判定 ─────────────────────────────── */
function creditHTML(c) {
  const t = c.total;
  const banner = t.met
    ? `<div class="notice pass"><b>學分判定通過。</b>認列 ${num(t.earned)} 學分，達畢業門檻 ${num(t.target)}。</div>`
    : `<div class="notice">距畢業門檻還差 <b>${num(t.remaining)}</b> 學分。目前認列 ${num(t.earned)}／${num(t.target)}${
        t.overCounted > 0
          ? `，另有 ${num(t.overCounted)} 學分實際修了但因項目額滿或未啟用而未認列`
          : ''
      }。</div>`;

  return banner + c.categories.map(categoryHTML).join('') + exceptionsHTML(c.exceptions);
}

function categoryHTML(cat) {
  if (!cat.active) return '';
  const extra = cat.countsTowardTotal ? '' : '<span style="font-weight:400;opacity:.8">（不計入畢業總學分）</span>';
  return `
    <div class="cat-block">
      <div class="cat-head" style="background:${esc(cat.color)}">
        <span>${cat.met ? '✓' : ''} ${esc(cat.label)} ${extra}</span>
        <span class="num">${num(cat.earned)} / ${num(cat.target)}</span>
      </div>
      ${cat.buckets.map(bucketHTML).join('')}
    </div>`;
}

function bucketHTML(b) {
  if (!b.active) {
    return `<div class="bkt-row off"><span class="bk-name">${esc(b.label)}<span class="bk-note">目前身分未啟用</span></span></div>`;
  }
  const pct = b.target ? Math.min(1, b.earned / b.target) : b.earned > 0 ? 1 : 0;

  const checks = b.checks
    .map(
      (k) =>
        `<div class="check-line${k.ok ? '' : ' bad'}">${k.ok ? '✓' : '✗'} ${esc(k.label)}　${num(
          k.have
        )} / ${num(k.need)} ${esc(k.unit)}</div>`
    )
    .join('');

  const detail = b.courses.length
    ? `<details class="course-detail">
        <summary>計入本項的 ${b.courses.length} 門課</summary>
        ${b.courses
          .map(
            (r) => `<div class="cd-row">
              <span>${esc(r.name)}${r.viaOverflow ? '<span class="cd-flag">溢出</span>' : ''}</span>
              <span class="cd-num">${num(r.counted)}${
              r.counted !== r.credit ? ` / ${num(r.credit)}` : ''
            }</span>
            </div>`
          )
          .join('')}
      </details>`
    : '';

  return `
    <div class="bkt-row${b.met ? ' met' : ''}">
      <span class="bk-name">${esc(b.label)}${
    b.note ? `<span class="bk-note">${esc(b.note)}</span>` : ''
  }</span>
      <span class="bar"><span class="${pct >= 1 ? 'full' : ''}" style="width:${pct * 100}%"></span></span>
      <span class="bk-num">${num(b.earned)} / ${b.target == null ? '—' : num(b.target)}</span>
    </div>
    ${checks}${detail}`;
}

function exceptionsHTML(ex) {
  const blocks = [];
  const list = (arr) => arr.map((c) => esc(c.name)).join('、');

  if (ex.untagged.length)
    blocks.push(
      `<b>${ex.untagged.length} 門課還沒設標籤</b>，不會計入任何學分：${list(ex.untagged)}`
    );
  if (ex.inactive.length)
    blocks.push(
      `<b>${ex.inactive.length} 門課的標籤對應到未啟用的項目</b>（例如還沒選輔系）：${list(ex.inactive)}`
    );
  if (ex.unmapped.length)
    blocks.push(`<b>${ex.unmapped.length} 門課的標籤沒有歸屬項目</b>：${list(ex.unmapped)}`);
  if (ex.dropped.length)
    blocks.push(
      `<b>${num(ex.dropped.reduce((s, d) => s + d.credit, 0))} 學分因項目額滿且無溢出去處而未認列</b>：${list(ex.dropped)}`
    );

  return blocks.length ? `<div class="notice bad">${blocks.join('<br>')}</div>` : '';
}

function issuesHTML(issues) {
  return `<div class="notice bad"><b>規則集有問題：</b><br>${issues
    .map((i) => `${i.level === 'error' ? '✗' : '⚠'} ${esc(i.message)}`)
    .join('<br>')}</div>`;
}
