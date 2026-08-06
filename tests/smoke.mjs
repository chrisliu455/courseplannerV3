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
check('主修單選清單有渲染', window.document.querySelectorAll('input[name=majorPick]').length === 2,
  String(window.document.querySelectorAll('input[name=majorPick]').length) + ' 個主修');
check('額外身分勾選框有渲染', window.document.querySelectorAll('input[data-identity]').length >= 1);
check('預設勾選動機系 114',
  window.document.querySelector('input[name=majorPick]:checked').value === 'major.dongji-114',
  window.document.querySelector('input[name=majorPick]:checked').value);
check('114 資料未核對有提醒', $('.data-warn') !== null && $('.data-warn').textContent.includes('核對'));
check('匯入清單有內容', $('#importList').children.length > 0, `${$('#importList').children.length} 列`);
check('八個學期格子都在', window.document.querySelectorAll('.sem-body').length === 8);
check('動機系 114 → 應修 129', text('#ledgerTotal') === '129', text('#ledgerTotal'));
check('判定分頁有兩個', $('#reportTabs').children.length === 2);
check('版本標記有顯示', $('#buildStamp').textContent.trim().length > 0, $('#buildStamp').textContent);

console.log('\n【自動保存開關】');
check('預設未打勾', store.persistEnabled === false && $('#persistToggle').checked === false);
check('標示「僅此瀏覽器」', $('.persist-toggle').textContent.includes('僅此瀏覽器'));
check('頁尾說明是「不會保存」', $('#persistNote').textContent.includes('不會保存'));
const pToggle = $('#persistToggle');
pToggle.checked = true;
pToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
check('點一下就開啟', store.persistEnabled === true);
check('頁尾說明改為「只儲存在這個瀏覽器中」',
  $('#persistNote').textContent.includes('只儲存在這個瀏覽器中'));
pToggle.checked = false;
pToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
check('再點一下關閉', store.persistEnabled === false);

console.log('\n【勾選輔系】');
const qfBox = window.document.querySelector('input[data-identity="minor.qf"]');
qfBox.checked = true;
qfBox.dispatchEvent(new window.Event('change', { bubbles: true }));
check('應修學分變成 149', text('#ledgerTotal') === '149', text('#ledgerTotal'));
check('輔系維持勾選狀態', window.document.querySelector('input[data-identity="minor.qf"]').checked);
check('標題列同時顯示兩個身分',
  $('#majorSub').textContent.includes('動機') && $('#majorSub').textContent.includes('計量財務'),
  $('#majorSub').textContent);
check('學分明細有三列（主修/輔系/合計）', window.document.querySelectorAll('.credit-sum .cs-row').length === 3);
check('匯入清單多了輔系指定科目', $('#importList').textContent.includes('衍生性金融市場'));

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
check('列出 9 個標籤（主修 8 ＋ 輔系 1）', window.document.querySelectorAll('.tag-table tbody tr').length === 9,
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

console.log('\n【取消勾選 → 學分要求跟著降】');
const qfCourses = store.identityCourseCount('minor.qf');
const qfBox2 = window.document.querySelector('input[data-identity="minor.qf"]');
qfBox2.checked = false;
qfBox2.dispatchEvent(new window.Event('change', { bubbles: true }));
check('應修學分回到 129', text('#ledgerTotal') === '129', text('#ledgerTotal'));
check('原輔系課程變成未設標籤（課沒被刪）',
  store.plan.courses.filter((c) => c.tag === null).length >= qfCourses);

console.log('\n【切換入學年度】');
const pick = (v) => {
  const r = window.document.querySelector(`input[name=majorPick][value="${v}"]`);
  r.checked = true;
  r.dispatchEvent(new window.Event('change', { bubbles: true }));
};
pick('major.dongji-113');
check('切到 113 學年', store.plan.majorId === 'major.dongji-113');
check('113 是已核對資料，沒有提醒', $('.data-warn') === null);
pick('major.dongji-114');
check('切回 114 學年 → 129', text('#ledgerTotal') === '129', text('#ledgerTotal'));
check('114 又出現待核對提醒', $('.data-warn') !== null);

console.log('\n【自訂身分】');
store.addCustomIdentity({ type: 'program', label: '人工智慧學程', credits: 12 });
check('應修學分變成 141', text('#ledgerTotal') === '141', text('#ledgerTotal'));
check('自訂身分出現在清單', $('#setupBox').textContent.includes('人工智慧學程'));

console.log('\n【從課表移回待排池】');
store.reset();
const c1 = store.addCourse({ name: '測試課程', credit: 3, tag: 'tag.dept' });
store.assign(c1.id, 'y1s1');
check('課在學期表裡', window.document.querySelectorAll('.sem-body .chip').length === 1);
const backBtn = window.document.querySelector('[data-unschedule]');
check('學期表卡片有「移回」按鈕（不是刪除）', backBtn !== null);
backBtn.click();
check('課程沒有被刪掉', store.plan.courses.length === 1);
check('semester 清空了', store.plan.courses[0].semester === null);
check('回到待排池', $('#poolContainer').textContent.includes('測試課程'));
check('學期表空了', window.document.querySelectorAll('.sem-body .chip').length === 0);
check('待排池的按鈕才是刪除', window.document.querySelector('#poolContainer [data-del]') !== null);
window.document.querySelector('#poolContainer [data-del]').click();
check('待排池按 × 才真的刪除', store.plan.courses.length === 0);

console.log('\n【一門課只算一個領域】');
store.reset();
store.setOption('track', 'control');
const mk = (n, tag) => store.assign(store.addCourse({ name: n, credit: 3, tag }).id, 'y3s1');
mk('工程光學', 'tag.physics');           // 同時符合物理與電控學程選修
['控制系統一', '控制系統二', '電子學二', '振動學'].forEach((n) => mk(n, 'tag.track'));
check('工程光學的學分全給物理領域', bucketOf('bkt.physics') === 3, String(bucketOf('bkt.physics')));
check('專業學程拿不到那 3 學分', bucketOf('bkt.track') === 12, String(bucketOf('bkt.track')));
$('#reportTabs').querySelector('[data-tab="subject"]').click();
check('科目判定仍打勾', window.document.body.innerHTML.includes('工程光學'));
check('畫面標示學分落在哪個領域', $('.stray-note') !== null && $('.stray-note').textContent.includes('物理領域'),
  $('.stray-note') ? $('.stray-note').textContent.slice(0, 40) : '沒有提示');

console.log('\n【沒有學分上限：超修全數計入】');
store.reset();
mk('工程光學', 'tag.physics');
mk('電磁學', 'tag.physics');
mk('近代物理導論', 'tag.physics');
mk('普通物理一', 'tag.physics');
check('物理領域拿到全部 12 學分', bucketOf('bkt.physics') === 12, String(bucketOf('bkt.physics')));
check('其他選修沒有被溢出灌水', bucketOf('bkt.elective') === 0, String(bucketOf('bkt.elective')));
$('#reportTabs').querySelector('[data-tab="credit"]').click();
check('已認列 = 實修 12 學分', text('#ledgerPlanned') === '12', text('#ledgerPlanned'));
check('畫面上不再出現「溢出」', !window.document.body.innerHTML.includes('溢出'));
check('沒有未認列的學分提醒', !window.document.body.innerHTML.includes('未認列'));

console.log('\n【結果】');
check('沒有未捕捉的執行期錯誤', errors.length === 0, errors.join(' / '));
console.log(process.exitCode ? '\n有項目失敗\n' : '\n全部通過\n');
