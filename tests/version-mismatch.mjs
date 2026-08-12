import { JSDOM } from '../node_modules/jsdom/lib/api.js';
import { readFileSync } from 'node:fs';
const R = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const fresh = readFileSync(`${R}/index.html`, 'utf8');
/* 版號從原始碼讀，寫死在測試裡的話每次改版都會變成假警報 */
const BUILD = readFileSync(`${R}/ui/main.js`, 'utf8').match(/export const BUILD = '(v\d+)';/)[1];
const N = BUILD.slice(1);
let pass = true;
const ck = (l,c,x='') => { console.log(`  ${c?'✓':'✗'} ${l}${x?' — '+x:''}`); if(!c) pass=false; };

async function boot(html, tag) {
  const dom = new JSDOM(html, { url: 'https://x.com/' });
  for (const k of ['window','document','navigator','HTMLElement','CustomEvent','Blob','FileReader','localStorage'])
    Object.defineProperty(globalThis, k, { value: dom.window[k], configurable:true, writable:true });
  globalThis.confirm = () => true;
  const errs = [];
  dom.window.addEventListener('error', e => errs.push(e.message));
  try { await import(`${R}/ui/main.js?${tag}`); } catch (e) { errs.push('THROW: ' + e.message); }
  return { dom, errs, $: q => dom.window.document.querySelector(q) };
}

console.log('【情境 A：模擬使用者的狀況 — 舊 index.html ＋ 新 ui/】');
// 舊 index.html：沒有 data-build、沒有 persistToggle、沒有 buildStamp
const old = fresh
  .replace(/<html lang="zh-Hant" data-build="v\d+">/, '<html lang="zh-Hant">')
  .replace(/<label class="persist-toggle"[\s\S]*?<\/label>\n/, '')
  .replace(/<span class="build-stamp"[\s\S]*?<\/span>\n/, '');
const a = await boot(old, 'a');
ck('沒有拋出未捕捉例外（不再整頁掛掉）', a.errs.length === 0, a.errs.join(' / '));
ck('八個學期格子仍正常渲染', a.dom.window.document.querySelectorAll('.sem-body').length === 8);
ck('匯出按鈕仍可用', a.$('#exportBtn') !== null);
const warn = [...a.dom.window.document.querySelectorAll('div')].find(d => d.textContent.includes('檔案版本不一致'));
ck('顯示「檔案版本不一致」提示', !!warn);
ck('提示點名 index.html', warn && warn.textContent.includes('index.html'), warn ? warn.textContent.slice(0,60).replace(/\s+/g,' ') : '');

console.log('\n【情境 B：檔案齊全的正常狀況】');
const b = await boot(fresh, 'b');
ck('沒有錯誤', b.errs.length === 0, b.errs.join(' / '));
ck('不顯示版本不一致提示',
  ![...b.dom.window.document.querySelectorAll('div')].some(d => d.textContent.includes('檔案版本不一致')));
ck('自動保存開關存在', b.$('#persistToggle') !== null);
ck(`版本標記顯示 ${BUILD}`, b.$('#buildStamp').textContent.trim() === BUILD, b.$('#buildStamp').textContent);

console.log('\n【情境 C：快取破壞 — index.html 的網址都帶著同一個版號】');
/* 這一組是這次假警報的根因：檔案沒錯，是瀏覽器把舊的 ui/main.js 配上新的 index.html。
   只要每個模組的網址都帶版號，新舊就不可能混用。 */
ck(`data-build 是 ${BUILD}`, fresh.includes(`data-build="${BUILD}"`));
ck(`入口 script 帶 ?v=${N}`, fresh.includes(`src="./ui/main.js?v=${N}"`));
ck(`app.css 帶 ?v=${N}`, fresh.includes(`href="./assets/app.css?v=${N}"`));
const map = fresh.match(/<script type="importmap">([\s\S]*?)<\/script>/);
ck('有 importmap 區塊', !!map);
if (map) {
  const { imports } = JSON.parse(map[1]);
  const entries = Object.entries(imports);
  ck('每一筆都對應到同一個版號', entries.every(([k, v]) => v === `${k}?v=${N}`),
    `${entries.length} 個模組`);
  ck('涵蓋 store 與 engine', !!imports['./ui/store.js'] && !!imports['./engine/index.js']);
  ck('入口自己不進 importmap（由 script src 帶版號）', !imports['./ui/main.js']);
}

console.log(pass ? '\n全部通過\n' : '\n有項目失敗\n');
process.exitCode = pass ? 0 : 1;
