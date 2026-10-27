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

/** courseId → 這門課的學分實際落在哪個領域。用來解釋「為什麼這門課打了勾學分卻沒進來」 */
let landedIn = new Map();

const semLabel = (id) => {
  const s = SEMESTERS.find((x) => x.id === id);
  return s ? `${s.year}${s.term}` : '';
};

export function renderReport(report) {
  const s = report.subject;
  const c = report.credit;

  landedIn = new Map();
  c.categories.forEach((cat) =>
    cat.buckets.forEach((b) => b.courses.forEach((r) => landedIn.set(r.courseId, b.label)))
  );

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
  const strays = collectStrays(g);
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
      ${
        strays.length
          ? `<div class="stray-note">⚑ ${strays.length} 門課有排到，但學分算在別的領域：${strays
              .map((x) => `${esc(x.name)}（${esc(x.where)}）`)
              .join('、')}。一門課的學分只會算一個領域，本項的學分可能因此不足。</div>`
          : ''
      }
      ${items}${subs}
    </div>`;
}

/** 撈出這個群組裡「有修但學分跑到別處」的課 */
function collectStrays(g) {
  const out = [];
  const walk = (node) => {
    node.items.forEach((i) => {
      if (i.checked && i.tagMismatch) {
        out.push({ name: i.name, where: landedIn.get(i.courseId) || '未計入任何領域' });
      }
    });
    node.groups.forEach(walk);
  };
  walk(g);
  return out;
}

function itemHTML(i) {
  const where = i.tagMismatch ? landedIn.get(i.courseId) || '未計入' : '';
  return `
    <div class="subj-item${i.checked ? ' checked' : ''}" title="${esc(i.note || '')}">
      <span class="mark">${i.checked ? '☑' : '☐'}</span>
      <span class="nm">${esc(i.name)}${
    where
      ? ` <span class="mismatch" title="這門課的學分算在「${esc(where)}」，不會計入本項">⚑ ${esc(where)}</span>`
      : ''
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
    <div class="cat-block" style="--tag:${esc(cat.color)}">
      <div class="cat-head">
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
              <span class="cd-num">${num(r.counted)}</span>
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

  if (ex.duplicates.length)
    blocks.push(
      `<b>${ex.duplicates.length} 門課排了不只一次</b>，學分會被重複計算：${ex.duplicates
        .map((d) => `${esc(d.name)}（${d.count} 筆）`)
        .join('、')}。請到待排清單或課表刪掉多餘的那幾筆。`
    );
  if (ex.untagged.length)
    blocks.push(
      `<b>${ex.untagged.length} 門課還沒設標籤</b>，不會計入任何學分：${list(ex.untagged)}`
    );
  if (ex.inactive.length)
    blocks.push(
      `<b>${ex.inactive.length} 門課的標籤對應到未啟用的項目</b>：${list(ex.inactive)}`
    );
  if (ex.unmapped.length)
    blocks.push(
      `<b>${ex.unmapped.length} 門課的標籤已失效</b>（通常是移除了某個身分別）：${list(ex.unmapped)}`
    );
  if (ex.dropped.length)
    blocks.push(
      `<b>${ex.dropped.length} 門課因所屬項目額滿、又沒有指定溢出去處而未認列</b>：${list(ex.dropped)}`
    );

  return blocks.length ? `<div class="notice bad">${blocks.join('<br>')}</div>` : '';
}

function issuesHTML(issues) {
  return `<div class="notice bad"><b>規則集有問題：</b><br>${issues
    .map((i) => `${i.level === 'error' ? '✗' : '⚠'} ${esc(i.message)}`)
    .join('<br>')}</div>`;
}
