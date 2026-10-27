/**
 * ui/main.js — 把 store、引擎、各個 view 串起來
 *
 * 資料流是單向的：
 *   使用者操作 → store 改資料 → 通知 → evaluate() 重算 → 各 view 重畫
 * UI 從頭到尾沒有任何學分計算，全部問引擎。
 */

/** 版本標記：畫面右下角會顯示，用來確認瀏覽器跑的是不是最新檔案 */
export const BUILD = 'v21';

import { evaluate } from '../engine/index.js';
import { store } from './store.js';
import { $, num, toast } from './dom.js';
import { renderSetup } from './views/setup.js';
import { renderPool } from './views/pool.js';
import { renderGrid } from './views/grid.js';
import { renderWeek } from './views/week.js';
import { renderReport } from './views/report.js';
import { openTagEditor } from './views/tags.js';
import { openHelp, maybeAutoShowHelp } from './views/help.js';
import { openFeedback } from './views/feedback.js';

function renderAll() {
  const report = evaluate(store.plan, store.ruleset);
  renderHeader(report);
  renderSetup();
  renderPool();
  renderGrid();
  renderWeek();
  renderReport(report);
}

/* 元素可能不存在（例如 index.html 沒跟著更新），一律走這兩個 setter */
const setText = (sel, value) => {
  const el = $(sel);
  if (el) el.textContent = value;
};
const setHTML = (sel, value) => {
  const el = $(sel);
  if (el) el.innerHTML = value;
};

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
  setText('#majorSub', parts.join('　｜　'));

  const toggle = $('#persistToggle');
  if (toggle) toggle.checked = store.persistEnabled;
  setHTML(
    '#persistNote',
    store.persistEnabled
      ? '規劃<strong>只儲存在這個瀏覽器中</strong>，不會上傳，換裝置或換瀏覽器就看不到。共用電腦請記得用完取消勾選。'
      : '<strong>這個頁面不會保存資料</strong>，關掉或重新整理就會清空。勾選右上角「自動保存」可存在這個瀏覽器裡。'
  );
  setText('#ledgerTotal', num(t.target));
  setText('#ledgerPlanned', num(t.earned));
  setText('#ledgerRemain', num(t.remaining));

  const pct = t.target > 0 ? Math.min(1, t.earned / t.target) : 0;
  setText('#sealPct', Math.round(pct * 100) + '%');
  const ring = $('#sealRing');
  if (ring) ring.style.strokeDashoffset = String(201 - 201 * pct);
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
document.addEventListener('chip:selected', () => {
  renderGrid();
  renderWeek();
});

/**
 * 綁事件用這個，不要直接 $(...).addEventListener。
 * 少一個元素只會少一個功能，不會讓整頁掛掉——
 * 常見於 index.html 忘了跟著更新的時候。
 */
const missing = [];
function on(selector, event, handler) {
  const el = $(selector);
  if (!el) return missing.push(selector);
  el.addEventListener(event, handler);
}

on('#exportBtn', 'click', exportPlan);
on('#importBtn', 'click', () => $('#importFile')?.click());
on('#importFile', 'change', (e) => {
  if (e.target.files[0]) importPlan(e.target.files[0]);
  e.target.value = '';
});
on('#persistToggle', 'change', (e) => {
  store.setPersist(e.target.checked);
  toast(
    e.target.checked
      ? '已開啟自動保存，規劃只會存在這個瀏覽器裡'
      : '已關閉自動保存，並清除這個瀏覽器裡已存的規劃'
  );
});
on('#tagEditorBtn', 'click', openTagEditor);
on('#helpBtn', 'click', openHelp);
on('#feedbackBtn', 'click', openFeedback);
on('#resetBtn', 'click', () => {
  if (confirm('會清空所有課程與設定，且無法復原。建議先匯出備份。確定清空？')) {
    store.reset();
    toast('已清空');
  }
});

/* ── 側欄收起 ─────────────────────────────── */
/* 收起狀態只是畫面偏好、不含規劃內容，所以不管有沒有開自動保存都記在這個瀏覽器 */
const SIDEBAR_KEY = 'credit-planner/sidebar';
const layout = $('.layout');

function setSidebarCollapsed(collapsed, remember = true) {
  if (!layout) return;
  layout.classList.toggle('sidebar-collapsed', collapsed);
  const btn = $('#sidebarToggle');
  if (btn) {
    btn.textContent = collapsed ? '固定側欄' : '« 收起側欄';
    btn.title = collapsed ? '把側欄固定回左邊' : '收起側欄，滑鼠移到畫面最左邊時才浮出來';
    btn.setAttribute('aria-expanded', String(!collapsed));
  }
  if (!remember) return;
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'open');
  } catch {
    /* 無痕模式寫不進去：這次照樣收起，只是下次打開不會記得 */
  }
}

on('#sidebarToggle', 'click', (e) => {
  const collapse = !layout.classList.contains('sidebar-collapsed');
  setSidebarCollapsed(collapse);
  if (!collapse) return;
  // 剛按下時游標還停在側欄上，不處理的話側欄會「收起後仍浮在原地」，直到游標離開
  layout.classList.add('sidebar-away');
  e.currentTarget.blur();
});
/* 游標離開側欄、或重新碰到左邊細邊，就恢復「移過去就浮出」 */
on('.sidebar', 'mouseleave', () => layout.classList.remove('sidebar-away'));
on('#sidebarEdge', 'mouseenter', () => layout.classList.remove('sidebar-away'));

/* 拖曳課程時滑鼠的 hover 狀態不會更新，改看拖到哪裡：
   進課表 → 側欄收回，不擋住學期格子；碰到左邊細邊 → 側欄浮出，可以拖回待排課程 */
on('.main', 'dragover', () => {
  if (!layout.classList.contains('sidebar-collapsed')) return;
  layout.classList.add('sidebar-away');
  layout.classList.remove('sidebar-peek');
});
on('#sidebarEdge', 'dragover', () => {
  layout.classList.remove('sidebar-away');
  layout.classList.add('sidebar-peek');
});
document.addEventListener('dragend', () => layout?.classList.remove('sidebar-peek'));

let startCollapsed = false;
try {
  startCollapsed = localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
} catch {
  /* 讀不到就照預設展開 */
}
setSidebarCollapsed(startCollapsed, false);
/* 等第一個畫面畫好再開動畫，否則記住「收起」的人每次打開都會看到側欄滑出去 */
requestAnimationFrame(() => requestAnimationFrame(() => layout?.classList.add('sidebar-ready')));

/* ── 列表／週課表 ─────────────────────────── */
/* 跟側欄一樣只是畫面偏好，記在這個瀏覽器。兩種畫法讀同一份資料，每次重畫兩邊都會更新 */
const VIEW_KEY = 'credit-planner/view';

function setView(view, remember = true) {
  const week = view === 'week';
  const list = $('#semesterGrid');
  const weekGrid = $('#weekGrid');
  if (list) list.hidden = week;
  if (weekGrid) weekGrid.hidden = !week;
  document.querySelectorAll('#viewToggle [data-view]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.view === (week ? 'week' : 'list')));
  });
  if (!remember) return;
  try {
    localStorage.setItem(VIEW_KEY, week ? 'week' : 'list');
  } catch {
    /* 無痕模式：這次照樣切換，只是下次打開不會記得 */
  }
}

on('#viewToggle', 'click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (btn) setView(btn.dataset.view);
});

let startView = 'list';
try {
  startView = localStorage.getItem(VIEW_KEY) === 'week' ? 'week' : 'list';
} catch {
  /* 讀不到就照預設的列表 */
}
setView(startView, false);

/* 檔案版本對不上時講清楚，不要讓使用者對著壞掉的畫面猜 */
const pageBuild = document.documentElement.dataset.build || '(舊版，沒有版本標記)';
if (pageBuild !== BUILD || missing.length) {
  const detail =
    pageBuild !== BUILD
      ? `index.html 是 <b>${pageBuild}</b>，ui/main.js 是 <b>${BUILD}</b>。`
      : `index.html 缺少這些元素：<b>${missing.join('、')}</b>。`;
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div style="font:13px/1.7 system-ui;background:#FBF0E4;border:2px solid #B08D3F;
      padding:14px 18px;margin:14px;border-radius:3px;color:#1E2A38">
      <strong style="font-size:14px">檔案版本不一致</strong><br>
      ${detail}多半是瀏覽器還留著舊檔案，先按 <b>Ctrl+Shift+R</b>（Mac 是 Cmd+Shift+R）強制重新整理。
      重整後還在，才是檔案真的沒上傳齊全 —— 請把整包一起重新上傳（尤其是
      <code>index.html</code> 和 <code>assets/app.css</code>）。部分功能在修好之前無法使用。
    </div>`
  );
  console.warn('[學程規劃表] 版本不一致：index.html=' + pageBuild + '、main.js=' + BUILD, missing);
}

/* 沒開自動保存又排了課，關掉分頁前提醒一下 */
window.addEventListener('beforeunload', (e) => {
  if (store.persistEnabled || !store.plan.courses.length) return;
  e.preventDefault();
  e.returnValue = '';
});

setText('#buildStamp', BUILD);
console.log('[學程規劃表] 版本 ' + BUILD + '｜自動保存：' + (store.persistEnabled ? '開啟' : '關閉'));

renderAll();
maybeAutoShowHelp();
