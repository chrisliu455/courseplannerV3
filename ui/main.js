/**
 * ui/main.js — 把 store、引擎、各個 view 串起來
 *
 * 資料流是單向的：
 *   使用者操作 → store 改資料 → 通知 → evaluate() 重算 → 各 view 重畫
 * UI 從頭到尾沒有任何學分計算，全部問引擎。
 */

/** 版本標記：畫面右下角會顯示，用來確認瀏覽器跑的是不是最新檔案 */
export const BUILD = 'v6';

import { evaluate } from '../engine/index.js';
import { store } from './store.js';
import { $, num, toast } from './dom.js';
import { renderSetup } from './views/setup.js';
import { renderPool } from './views/pool.js';
import { renderGrid } from './views/grid.js';
import { renderReport } from './views/report.js';
import { openTagEditor } from './views/tags.js';

function renderAll() {
  const report = evaluate(store.plan, store.ruleset);
  renderHeader(report);
  renderSetup();
  renderPool();
  renderGrid();
  renderReport(report);
}

function renderHeader(report) {
  const { plan, ruleset } = store;
  const t = report.credit.total;

  const parts = [];
  if (plan.meta.studentName) parts.push(plan.meta.studentName);
  parts.push(ruleset.label);
  (ruleset.options || []).forEach((opt) => {
    const v = plan.options[opt.id];
    if (!v) return;
    const ch = opt.choices.find((c) => c.value === v);
    if (ch) parts.push(ch.label);
  });
  $('#majorSub').textContent = parts.join('　｜　');

  $('#persistToggle').checked = store.persistEnabled;
  $('#persistNote').innerHTML = store.persistEnabled
    ? '規劃會自動存在這台裝置的瀏覽器裡，重新整理不會消失。'
    : '<strong>這個頁面不會保存資料</strong>，關掉或重新整理就會清空。';
  $('#ledgerTotal').textContent = num(t.target);
  $('#ledgerPlanned').textContent = num(t.earned);
  $('#ledgerRemain').textContent = num(t.remaining);

  const pct = t.target > 0 ? Math.min(1, t.earned / t.target) : 0;
  $('#sealPct').textContent = Math.round(pct * 100) + '%';
  $('#sealRing').style.strokeDashoffset = String(201 - 201 * pct);
}

/* ── 檔案 ─────────────────────────────────── */
function exportPlan() {
  const blob = new Blob([store.exportPlan()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `學程規劃_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('規劃已下載');
}

function importPlan(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      store.importPlan(reader.result);
      toast('規劃已匯入');
    } catch (err) {
      toast('讀不到規劃資料：' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ── 啟動 ─────────────────────────────────── */
store.subscribe(renderAll);
document.addEventListener('report:refresh', renderAll);
document.addEventListener('chip:selected', renderGrid);

$('#exportBtn').addEventListener('click', exportPlan);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => {
  if (e.target.files[0]) importPlan(e.target.files[0]);
  e.target.value = '';
});
$('#persistToggle').addEventListener('change', (e) => {
  store.setPersist(e.target.checked);
  toast(e.target.checked ? '已開啟自動保存' : '已關閉自動保存，並清除已存的規劃');
});
$('#tagEditorBtn').addEventListener('click', openTagEditor);
$('#resetBtn').addEventListener('click', () => {
  if (confirm('會清空所有課程與設定，且無法復原。建議先匯出備份。確定清空？')) {
    store.reset();
    toast('已清空');
  }
});

/* 沒開自動保存又排了課，關掉分頁前提醒一下 */
window.addEventListener('beforeunload', (e) => {
  if (store.persistEnabled || !store.plan.courses.length) return;
  e.preventDefault();
  e.returnValue = '';
});

const stamp = document.getElementById('buildStamp');
if (stamp) stamp.textContent = BUILD;
console.log('[學程規劃表] 版本 ' + BUILD + '｜自動保存：' + (store.persistEnabled ? '開啟' : '關閉'));

renderAll();
