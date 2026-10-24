/**
 * tools/bump-build.mjs — 版號與快取破壞（cache busting）的唯一產生器
 *
 * 為什麼需要這支：
 *   index.html、ui/main.js、其餘模組是各自獨立被瀏覽器快取的
 *   （GitHub Pages 對每個檔案都送 Cache-Control: max-age=600）。
 *   只要其中一個過期、另一個還在快取裡，畫面就會跳「檔案版本不一致」，
 *   但檔案其實根本沒錯。
 *
 * 解法：把版號寫進每個模組的網址（?v=N）。
 *   新版號 = 新網址 = 瀏覽器一定重新下載，不可能新舊混用。
 *   模組之間的 import 不用改，由 index.html 裡的 importmap 統一改寫。
 *
 * 用法：
 *   node tools/bump-build.mjs          版號不變，只重新同步（改完 HTML 骨架時跑）
 *   node tools/bump-build.mjs --bump   版號 +1 再同步（每次要上傳新版時跑這個）
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODULE_DIRS = ['ui', 'engine', 'rulesets', 'offerings'];
const ENTRY = 'ui/main.js';
const START = '<!-- cache-bust:start -->';
const END = '<!-- cache-bust:end -->';

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const write = (p, s) => writeFileSync(join(ROOT, p), s);

/* 版號的唯一來源：ui/main.js 的 BUILD 常數 */
const mainSrc = read(ENTRY);
const found = mainSrc.match(/export const BUILD = 'v(\d+)';/);
if (!found) {
  console.error('✗ ui/main.js 找不到 BUILD 常數，無法決定版號');
  process.exit(1);
}
const n = Number(found[1]) + (process.argv.includes('--bump') ? 1 : 0);
const build = `v${n}`;

/* 瀏覽器會載入的模組（範本檔不會被 import，排除掉） */
const listModules = (dir) =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? listModules(`${dir}/${e.name}`)
      : e.name.endsWith('.js') && !e.name.startsWith('_TEMPLATE')
        ? [`${dir}/${e.name}`]
        : []
  );

/* 入口自己由 <script src> 帶版號，不必進 importmap */
const modules = MODULE_DIRS.flatMap(listModules)
  .filter((p) => p !== ENTRY)
  .sort();

const imports = Object.fromEntries(modules.map((p) => [`./${p}`, `./${p}?v=${n}`]));
const block = [
  START,
  '<!-- 這一段由 tools/bump-build.mjs 產生，請不要手改 -->',
  '<script type="importmap">',
  JSON.stringify({ imports }, null, 2),
  '</script>',
  END,
].join('\n');

let html = read('index.html');
html = html.replace(/data-build="v\d+"/, `data-build="${build}"`);
html = html.replace(/href="\.\/assets\/app\.css(\?v=\d+)?"/, `href="./assets/app.css?v=${n}"`);
html = html.replace(/src="\.\/ui\/main\.js(\?v=\d+)?"/, `src="./ui/main.js?v=${n}"`);

if (html.includes(START) && html.includes(END)) {
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
} else {
  /* importmap 必須排在第一個 module script 之前，放進 </head> 最保險 */
  html = html.replace('</head>', `${block}\n</head>`);
}
write('index.html', html);
write(ENTRY, mainSrc.replace(/export const BUILD = 'v\d+';/, `export const BUILD = '${build}';`));

/* 產完自我檢查，避免這支腳本本身變成版號不一致的來源 */
const finalHtml = read('index.html');
const ok =
  finalHtml.includes(`data-build="${build}"`) &&
  finalHtml.includes(`./ui/main.js?v=${n}`) &&
  finalHtml.includes(`./assets/app.css?v=${n}`) &&
  read(ENTRY).includes(`export const BUILD = '${build}';`);

console.log(`${ok ? '✓' : '✗'} 版號 ${build}｜importmap ${modules.length} 個模組`);
process.exitCode = ok ? 0 : 1;
