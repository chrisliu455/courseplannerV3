/**
 * tests/feedback.mjs — 回報問題
 *
 * 重點不在「送得出去」（那要真的打到 Google，測不了），而在於：
 *   送出去的內容到底是什麼、什麼時候不該送、送失敗時使用者打的字有沒有被弄丟。
 *
 * 這支不進 npm test（需要 jsdom）：node tests/feedback.mjs
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const load = (p) => import(new URL(p, ROOT).href);

const dom = new JSDOM(html, { url: 'https://x.com/' });
/* location 一定要一起搬過去：buildDiagnostics() 會讀 location.href */
for (const k of ['window', 'document', 'navigator', 'location', 'localStorage',
                 'HTMLElement', 'CustomEvent', 'Blob', 'FileReader']) {
  Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true });
}
globalThis.confirm = () => true;

const { store } = await load('ui/store.js');
const cfg = await load('ui/feedback-config.js');
const { openFeedback } = await load('ui/views/feedback.js');

let pass = true;
const ck = (label, cond, extra = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!cond) pass = false;
};

const $ = (s) => dom.window.document.querySelector(s);
const closeModal = () => $('.overlay')?.remove();
const clearCooldown = () => localStorage.removeItem('credit-planner/feedback-last');
const tick = () => new Promise((r) => setTimeout(r, 0));

/* 攔下所有送出，記下實際內容 */
let calls = [];
const stubFetch = (impl) => {
  globalThis.fetch = (url, init) => {
    calls.push({ url, init, body: init?.body ? Object.fromEntries(init.body.entries()) : null });
    return impl ? impl() : Promise.resolve({});
  };
};

/* 準備一份有姓名、有課的規劃 */
store.reset();
store.setMeta('studentName', '測試姓名');
store.addCourse({ name: '工程數學一', credit: 3, tag: 'tag.dept' });

console.log('\n【視窗內容】');
clearCooldown();
calls = [];
stubFetch();
openFeedback();
ck('視窗開啟', $('.overlay') !== null && $('#fbMessage') !== null);
ck('email 是選填欄位', $('#fbEmail') !== null && !$('#fbEmail').required);
ck('附上完整規劃預設不勾', $('#fbAttachPlan').checked === false);
const diagText = $('details pre').textContent;
ck('診斷資訊列出版號與主修', diagText.includes('版號：v') && diagText.includes('major.dongji-114'));
ck('診斷資訊不含姓名', !diagText.includes('測試姓名'));

console.log('\n【該擋下來的情況】');
$('#fbMessage').value = 'abc';
$('#fbSend').click();
await tick();
ck('內容太短不送出', calls.length === 0);
ck('太短時視窗留著', $('.overlay') !== null);

$('#fbMessage').value = '輔系學分沒有算進去，判定結果不對';
$('#fbSend').click();
await tick();
ck('尚未設定表單時不發請求', calls.length === 0);
ck('改為提示複製內容', !$('#fbError').hidden && $('#fbError').textContent.includes('複製內容'));
ck('視窗與文字都留著', $('.overlay') !== null && $('#fbMessage').value.includes('輔系學分'));

console.log('\n【設定好之後送出】');
cfg.FEEDBACK.formId = '1FAIpQLSfTESTFORMID';
cfg.FEEDBACK.fields = { message: 'entry.111', email: 'entry.222', diagnostics: 'entry.333', plan: 'entry.444' };
cfg.FEEDBACK.contactEmail = 'owner@example.com';
ck('isConfigured() 為 true', cfg.isConfigured() === true);

closeModal();
calls = [];
clearCooldown();
openFeedback();
$('#fbMessage').value = '衍生性金融市場的學分沒算進輔系';
$('#fbEmail').value = 'student@example.com';
$('#fbSend').click();
await tick();
ck('送出一次請求', calls.length === 1, `${calls.length} 次`);
ck('打到 formResponse', calls[0]?.url.includes('/forms/d/e/1FAIpQLSfTESTFORMID/formResponse'), calls[0]?.url);
ck('POST + no-cors', calls[0]?.init.method === 'POST' && calls[0]?.init.mode === 'no-cors');
ck('問題描述對應 entry.111', calls[0]?.body['entry.111'] === '衍生性金融市場的學分沒算進輔系');
ck('email 對應 entry.222', calls[0]?.body['entry.222'] === 'student@example.com');
ck('診斷資訊對應 entry.333', (calls[0]?.body['entry.333'] || '').includes('版號：v'));
ck('沒勾選時規劃欄位送空字串', calls[0]?.body['entry.444'] === '');
ck('送出後視窗關閉', $('.overlay') === null);

console.log('\n【勾選附上完整規劃】');
closeModal();
calls = [];
clearCooldown();
openFeedback();
$('#fbMessage').value = '這是附上完整規劃的測試';
$('#fbAttachPlan').checked = true;
$('#fbSend').click();
await tick();
const attached = calls[0]?.body['entry.444'] || '';
ck('規劃內容有帶上課名', attached.includes('工程數學一'));
ck('姓名已被移除', !attached.includes('測試姓名'));
ck('meta 本身仍在（只拿掉姓名欄）', attached.includes('"meta"'));

console.log('\n【連續送出】');
closeModal();
calls = [];
openFeedback();
$('#fbMessage').value = '馬上再送一次應該要被擋下來';
$('#fbSend').click();
await tick();
ck('冷卻時間內重送被擋下', calls.length === 0, `${calls.length} 次`);

console.log('\n【送出失敗】');
closeModal();
calls = [];
clearCooldown();
stubFetch(() => Promise.reject(new Error('offline')));
openFeedback();
$('#fbMessage').value = '網路斷掉的情況，這段文字不可以消失';
$('#fbSend').click();
await tick();
await tick();
ck('視窗沒有關掉', $('.overlay') !== null);
ck('使用者打的字還在', $('#fbMessage').value.includes('這段文字不可以消失'));
ck('顯示錯誤並給出備援信箱', !$('#fbError').hidden && $('#fbError').textContent.includes('owner@example.com'));
ck('送出鈕恢復可按', $('#fbSend').disabled === false && $('#fbSend').textContent === '送出');

console.log(pass ? '\n全部通過\n' : '\n有項目失敗\n');
process.exitCode = pass ? 0 : 1;
