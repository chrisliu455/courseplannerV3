/**
 * 驗證「完全不保存」：每次開站都是空白，且會清掉先前殘留的資料。
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

console.log('【模擬「曾經開過自動保存」的瀏覽器】');
// 舊版留下的：排好的課 + 開關旗標
shared.setItem('credit-planner/plan/v2', JSON.stringify({
  majorId: 'major.dongji-114',
  courses: [{ id: 'c1', name: '別人排的課', credit: 3, tag: 'tag.dept', semester: 'y1s1' }],
}));
shared.setItem('credit-planner/persist', 'on');
shared.setItem('credit-planner/plan/v1', JSON.stringify({ rulesetId: 'dongji-113', courses: [] }));
ck('前置：localStorage 確實有殘留資料', shared.length === 3, `${shared.length} 筆`);

let s = await openSite();
ck('開站後看不到別人的課', s.plan.courses.length === 0, `${s.plan.courses.length} 門`);
ck('保存功能是關閉的', s.persistEnabled === false);
ck('規劃資料已被清除', shared.getItem('credit-planner/plan/v2') === null);
ck('舊版 v1 資料已被清除', shared.getItem('credit-planner/plan/v1') === null);
ck('開關旗標也被清除（不會殘留成 on）', shared.getItem('credit-planner/persist') === null);
ck('localStorage 完全乾淨', shared.length === 0, `剩 ${shared.length} 筆`);

console.log('\n【使用中不會寫回 localStorage】');
s.addCourse({ name: '我排的課', credit: 3, tag: 'tag.dept' });
ck('課程加入成功', s.plan.courses.length === 1);
ck('localStorage 仍然是空的', shared.length === 0, `${shared.length} 筆`);

console.log('\n【重新開站】');
s = await openSite();
ck('又是空白的', s.plan.courses.length === 0);

console.log('\n【匯出／匯入仍可帶走規劃】');
s.addCourse({ name: '要帶走的課', credit: 3, tag: 'tag.dept' });
const json = s.exportPlan();
s.reset();
ck('清空後沒有課', s.plan.courses.length === 0);
s.importPlan(json);
ck('匯入後課程回來', s.plan.courses.length === 1 && s.plan.courses[0].name === '要帶走的課');
ck('匯入也不會寫進 localStorage', shared.length === 0);

console.log(pass ? '\n全部通過\n' : '\n有項目失敗\n');
process.exitCode = pass ? 0 : 1;
