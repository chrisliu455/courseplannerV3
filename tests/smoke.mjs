/**
 * 冒煙測試：用 jsdom 載入真正的 index.html 與 ui/main.js，
 * 走一遍「匯入規定科目 → 排課 → 改標籤 → 看判定結果」，確認沒有執行期錯誤。
 * 這支不進 npm test（需要 jsdom），是開發時手動跑的驗證腳本。
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');

const dom = new JSDOM(html, { url: 'https://example.com/', pretendToBeVisual: true });
const { window } = dom;

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));

// 把 jsdom 的環境搬到 global，讓模組直接用
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'CustomEvent', 'Blob', 'FileReader', 'localStorage']) {
  Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true });
}
globalThis.confirm = () => true;
globalThis.URL.createObjectURL = () => 'blob:x';
globalThis.URL.revokeObjectURL = () => {};

const load = (p) => import(pathToFileURL(new URL(p, root).pathname).href);

await load('ui/main.js');
const { store } = await load('ui/store.js');
const { evaluate } = await load('engine/index.js');

const $ = (s) => window.document.querySelector(s);
const text = (s) => $(s)?.textContent.trim();
const check = (label, cond, extra = '') => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!cond) process.exitCode = 1;
};

console.log('\n【啟動】');
check('側欄設定區有渲染', $('#rulesetSelect') !== null);
check('匯入清單有內容', $('#importList').children.length > 0, `${$('#importList').children.length} 列`);
check('八個學期格子都在', window.document.querySelectorAll('.sem-body').length === 8);
check('應修學分顯示 129', text('#ledgerTotal') === '129', text('#ledgerTotal'));
check('判定分頁有兩個', $('#reportTabs').children.length === 2);

console.log('\n【匯入規定科目】');
$('#importToggleAll').click();
$('#importAddBtn').click();
check('課程池有課了', store.plan.courses.length > 0, `${store.plan.courses.length} 門`);
check('匯入的課自動帶了標籤', store.plan.courses.every((c) => c.tag || c.credit === 0));

console.log('\n【排課】');
store.plan.courses.slice(0, 5).forEach((c) => store.assign(c.id, 'y1s1'));
const y1s1 = [...window.document.querySelectorAll('.sem-body')][0];
check('大一上出現 5 張卡片', y1s1.querySelectorAll('.chip').length === 5);
check('學分結算不是 0', text('#ledgerPlanned') !== '0', text('#ledgerPlanned'));

console.log('\n【切到科目判定分頁】');
$('#reportTabs').querySelector('[data-tab="subject"]').click();
check('科目群組有渲染', window.document.querySelectorAll('.subj-group').length > 0);
check('有打勾的科目', window.document.querySelectorAll('.subj-item.checked').length === 5,
  String(window.document.querySelectorAll('.subj-item.checked').length));

console.log('\n【選專業學程 → 規則跟著變】');
const before = window.document.querySelectorAll('.subj-group').length;
store.setOption('track', 'control');
const after = window.document.querySelectorAll('.subj-group').length;
check('學程群組出現了', after > before, `${before} → ${after} 組`);

console.log('\n【改標籤 → 學分換一類】');
$('#reportTabs').querySelector('[data-tab="credit"]').click();
const target = store.plan.courses.find((c) => c.tag === 'tag.dept');
store.assign(target.id, 'y1s2');
const bucketOf = (id) => {
  const r = evaluate(store.plan, store.ruleset);
  for (const cat of r.credit.categories) {
    const b = cat.buckets.find((x) => x.id === id);
    if (b) return b.earned;
  }
};
const deptBefore = bucketOf('bkt.dept');
store.updateCourse(target.id, { tag: 'tag.major-elective' });
check('系定必修學分減少', bucketOf('bkt.dept') === deptBefore - target.credit,
  `${deptBefore} → ${bucketOf('bkt.dept')}`);
check('其他選修學分增加', bucketOf('bkt.elective') === target.credit);

console.log('\n【標籤設定視窗】');
const { openTagEditor } = await load('ui/views/tags.js');
openTagEditor();
check('視窗開啟', $('.overlay') !== null);
check('列出 10 個標籤', window.document.querySelectorAll('.tag-table tbody tr').length === 10,
  String(window.document.querySelectorAll('.tag-table tbody tr').length));
$('#tagClose').click();
check('視窗關閉', $('.overlay') === null);

console.log('\n【匯出 / 匯入】');
const json = store.exportPlan();
const count = store.plan.courses.length;
store.reset();
check('清空後沒有課', store.plan.courses.length === 0);
store.importPlan(json);
check('匯入後課程回來了', store.plan.courses.length === count, `${count} 門`);
const scheduled = store.plan.courses.filter((c) => c.semester).length;
check('匯入後畫面與資料一致', window.document.querySelectorAll('.sem-body .chip').length === scheduled,
  `畫面 ${window.document.querySelectorAll('.sem-body .chip').length} / 資料 ${scheduled}`);

console.log('\n【溢出規則實際跑一次】');
store.reset();
['工程光學', '電磁學', '普通物理一'].forEach((n) =>
  store.assign(store.addCourse({ name: n, credit: 3, tag: 'tag.physics' }).id, 'y2s1')
);
check('物理領域停在 6 學分', bucketOf('bkt.physics') === 6, String(bucketOf('bkt.physics')));
check('多的 3 學分溢到其他選修', bucketOf('bkt.elective') === 3, String(bucketOf('bkt.elective')));
check('畫面上出現「溢出」標記', window.document.body.innerHTML.includes('溢出'));

console.log('\n【結果】');
check('沒有未捕捉的執行期錯誤', errors.length === 0, errors.join(' / '));
console.log(process.exitCode ? '\n有項目失敗\n' : '\n全部通過\n');
