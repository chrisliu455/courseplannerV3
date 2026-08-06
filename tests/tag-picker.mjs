import { JSDOM } from '../node_modules/jsdom/lib/api.js';
import { readFileSync } from 'node:fs';
const R = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const dom = new JSDOM(readFileSync(`${R}/index.html`,'utf8'), { url:'https://x.com/' });
const { window } = dom;
for (const k of ['window','document','navigator','HTMLElement','CustomEvent','Blob','FileReader','localStorage'])
  Object.defineProperty(globalThis, k, { value: window[k], configurable:true, writable:true });
globalThis.confirm = () => true;
await import(`${R}/ui/main.js`);
const { store } = await import(`${R}/ui/store.js`);
const $ = q => window.document.querySelector(q);
let pass = true;
const ck = (l,c,x='') => { console.log(`  ${c?'✓':'✗'} ${l}${x?' — '+x:''}`); if(!c) pass=false; };
const pickGroup = (v) => { const s=$('#courseGroup'); s.value=v; s.dispatchEvent(new window.Event('change',{bubbles:true})); };

console.log('【第一層：課程類別】');
const opts = [...$('#courseGroup').options].map(o => o.textContent);
console.log('  選項：' + opts.join(' / '));
ck('預設是「未設定」', $('#courseGroup').value === '');
ck('沒選類別時不出現第二層', $('#courseTag').type === 'hidden');

console.log('\n【選「通識」→ 出現第二層】');
pickGroup('bkt.ge');
ck('第二層出現了', $('#courseTag').tagName === 'SELECT');
const sub = [...$('#courseTag').options].map(o => o.textContent);
console.log('  第二層選項：' + sub.join(' / '));
ck('五個選項（四向度＋一般通識）', sub.length === 5, `${sub.length} 個`);
ck('問句提到通識', $('label[for=courseTag]').textContent.includes('通識'),
   $('label[for=courseTag]').textContent);

console.log('\n【選「大學中文」→ 只有一個標籤，不問第二層】');
pickGroup('bkt.chinese');
ck('第二層是隱藏欄位', $('#courseTag').type === 'hidden');
ck('標籤自動帶入大學中文', $('#courseTag').value === 'tag.chinese', $('#courseTag').value);

console.log('\n【實際新增一門向度三的通識課】');
pickGroup('bkt.ge');
$('#courseTag').value = 'tag.ge-core-3';
$('#courseName').value = '科技與社會';
$('#courseCredit').value = '3';
$('#addCourseBtn').click();
const added = store.plan.courses.at(-1);
ck('課程加入成功', added && added.name === '科技與社會');
ck('標籤正確', added.tag === 'tag.ge-core-3', added.tag);

console.log('\n【換到電機系也自動跟著變】');
const r = window.document.querySelector('input[name=majorPick][value="major.ee-114"]');
r.checked = true; r.dispatchEvent(new window.Event('change',{bubbles:true}));
console.log('  類別選項：' + [...$('#courseGroup').options].map(o=>o.textContent).join(' / '));
pickGroup('bkt.ee-lab');
ck('電機系「必選實驗」只有一個標籤，不問第二層', $('#courseTag').type === 'hidden');
pickGroup('bkt.ge');
ck('電機系通識一樣有五個細分', [...$('#courseTag').options].length === 5);

console.log('\n【課程卡上的下拉用 optgroup】');
store.assign(store.plan.courses[0].id, null);
const chipSel = $('#poolContainer .tag-pick');
ck('卡片下拉存在', chipSel !== null);
ck('通識收在 optgroup 底下', chipSel.querySelector('optgroup[label*="通識"]') !== null);
ck('單一標籤的項目沒有多包一層 optgroup',
   [...chipSel.querySelectorAll('optgroup')].length === 1,
   `${[...chipSel.querySelectorAll('optgroup')].length} 組`);

console.log(pass ? '\n全部通過\n' : '\n有項目失敗\n');
process.exitCode = pass ? 0 : 1;
