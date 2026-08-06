/**
 * 自動保存開關的跨工作階段測試。
 * 每次用不同的 query 匯入 store.js = 模擬重新開啟網站。
 * 需要 jsdom：npm install jsdom --no-save
 */
import { JSDOM } from '../node_modules/jsdom/lib/api.js';
const R = new URL('..', import.meta.url).pathname;

const shared = new JSDOM('', { url: 'https://x.com/' }).window.localStorage;
Object.defineProperty(globalThis, 'localStorage', { value: shared, configurable: true, writable: true });

let pass = true;
const ck = (l, c, x = '') => { console.log(`  ${c ? '✓' : '✗'} ${l}${x ? ' — ' + x : ''}`); if (!c) pass = false; };
let n = 0;
const openSite = async () => (await import(`${R}ui/store.js?session=${++n}`)).store;

console.log('【第 1 次開站：預設關閉】');
let s = await openSite();
ck('自動保存預設關閉', s.persistEnabled === false);
s.addCourse({ name: '測試課程A', credit: 3, tag: 'tag.dept' });
ck('沒有寫進 localStorage', shared.getItem('credit-planner/plan/v2') === null);

console.log('\n【第 2 次開站：應該是空的】');
s = await openSite();
ck('課程被清空', s.plan.courses.length === 0, `${s.plan.courses.length} 門`);

console.log('\n【打開自動保存】');
s.setPersist(true);
ck('開關已開啟', s.persistEnabled === true);
s.addCourse({ name: '測試課程B', credit: 3, tag: 'tag.dept' });
ck('規劃已寫進 localStorage', shared.getItem('credit-planner/plan/v2') !== null);

console.log('\n【第 3 次開站：讀回資料】');
s = await openSite();
ck('開關記住了「開啟」', s.persistEnabled === true);
ck('課程被讀回來', s.plan.courses.length === 1 && s.plan.courses[0].name === '測試課程B',
  s.plan.courses.map((x) => x.name).join(',') || '空的');

console.log('\n【關掉自動保存：一併清除已存的規劃】');
s.setPersist(false);
ck('已存的規劃被清除', shared.getItem('credit-planner/plan/v2') === null);
ck('開關設定記為 off', shared.getItem('credit-planner/persist') === 'off');

console.log('\n【第 4 次開站：又是空的】');
s = await openSite();
ck('回到空白且開關為關', s.plan.courses.length === 0 && s.persistEnabled === false);

console.log('\n【B 使用者的瀏覽器：獨立的 localStorage】');
// A 開了自動保存並存了課
s = await openSite();
s.setPersist(true);
s.addCourse({ name: 'A使用者的課', credit: 3, tag: 'tag.dept' });
ck('A 的資料已存在 A 的瀏覽器', shared.getItem('credit-planner/plan/v2') !== null);

// B 用另一個瀏覽器打開（另一份完全獨立的 localStorage）
const bStorage = new JSDOM('', { url: 'https://x.com/' }).window.localStorage;
Object.defineProperty(globalThis, 'localStorage', { value: bStorage, configurable: true, writable: true });
const sB = await openSite();
ck('B 看不到 A 的課', sB.plan.courses.length === 0, `${sB.plan.courses.length} 門`);
ck('B 的自動保存也是預設關閉', sB.persistEnabled === false);
ck('A 的資料仍在 A 那邊，沒有互相影響', shared.getItem('credit-planner/plan/v2') !== null);

console.log(pass ? '\n全部通過\n' : '\n有項目失敗\n');
process.exitCode = pass ? 0 : 1;
