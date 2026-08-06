# 學程規劃表

四年課表規劃與畢業學分判定工具。純靜態網站，可直接部署到 GitHub Pages。

**UI 與判定引擎完全分離**：引擎是純函式，不碰 DOM；UI 不做任何學分計算。

---

## 部署到 GitHub Pages

1. 把整個資料夾推上 GitHub（`index.html` 要在 repo 根目錄）
2. Settings → Pages → Source 選 **GitHub Actions**
3. 推上去就會自動部署到 `https://<帳號>.github.io/<repo>/`

或不用 Actions：Source 選 **Deploy from a branch** → `main` / `(root)` 也可以。

### 本機開發

專案用 ES modules，**不能直接用瀏覽器開 `index.html`**（`file://` 會被 CORS 擋掉）。起一個本機伺服器：

```bash
python3 -m http.server 8080   # 然後開 http://localhost:8080
```

### 測試

```bash
node --test tests/engine.test.mjs   # 引擎單元測試，不需要任何套件
node tests/smoke.mjs                # 全 UI 冒煙測試，需先 npm install jsdom
```

---

## 檔案結構

```
index.html              只有骨架，沒有邏輯
assets/app.css          外觀

engine/                 判定引擎（純函式，可在 Node 執行）
  index.js                對外入口：evaluate(plan, ruleset)
  merge.js                身分模組合併
  subject.js              科目判定
  credit.js               學分判定
  ruleset.js              索引、標籤編輯套用、規則集健檢

rulesets/               身分模組（純資料，沒有程式邏輯）
  major.dongji-114.js     主修：動機系 114 學年（預設，資料待核對）
  major.dongji-113.js     主修：動機系 113 學年（129 學分）
  major.ee-114.js         主修：電機系 114 學年（128 學分）
  minor.qf.js             輔系：計財系（＋20 學分）
  index.js                註冊表

ui/                     介面層（不做任何計算）
  main.js                 串接 store、引擎、各 view
  store.js                狀態、localStorage、匯入匯出
  views/                  setup / pool / grid / report / tags
```

**依賴方向是單向的**：`ui/ → engine/ → rulesets/`。引擎不知道 UI 存在。

---

## 引擎介面

UI 只需要知道一個函式：

```js
import { evaluate, mergeModules } from './engine/index.js';
import major from './rulesets/major.dongji-113.js';
import minorQf from './rulesets/minor.qf.js';

const ruleset = mergeModules([major, minorQf]);   // 129 + 20 = 149 學分
const report = evaluate(plan, ruleset);
```

### 輸入 `plan`

```js
{
  majorId:     'major.dongji-113',    // 主修，只能一個
  identityIds: ['minor.qf'],          // 額外身分，可以多個
  customIdentities: [],               // 自訂身分：{ id, type, label, credits }
  options:     { track: 'control' },  // 修業選項（專業學程四擇一）
  courses: [
    { id: 'c1', name: '微積分一', credit: 3, tag: 'tag.dept', semester: 'y1s1' }
  ],
  tagEdits: { tags: {}, moves: {}, custom: [] }   // 使用者對標籤的編輯
}
```

一門課**只有一個標籤**。`semester` 是 `null` 代表還在待排清單，不列入判定。

### 輸出 `report`

```js
{
  subject: { groups, allSatisfied, totals, missing },
  credit:  { categories, total, exceptions, allocations },
  issues:  [{ level, message }]     // 規則集本身寫錯時的警告
}
```

引擎是純函式：同樣的輸入一定得到同樣的輸出，不會改到傳進去的物件。

---

## 判定模型

### 科目判定

規定要修的科目，**排進學期就打勾**。群組達標條件有四種：

| `rule.type` | 意思 |
|---|---|
| `all` | 全部科目都要修（預設） |
| `atLeastCourses` | 至少 n 門（五選二用這個） |
| `atLeastCredits` | 至少 n 學分 |
| `optional` | 只列出參考，不影響達標 |

群組可以巢狀，例如專業學程 = 核心 3 門（`all`）＋ 選修 2 門（`atLeastCourses`）。

### 身分別決定畢業標準

畢業應修學分 ＝ 每個身分模組的 `totalCredits` 相加。

| 身分 | 學分 | 額外規定 |
|---|---|---|
| 主修 動機工程學系 114 | 129 | 校定必修 30 ＋ 系定必修 64 ＋ 專業學程 15 ＋ 其他選修 20 |
| 輔系 計量財務金融學系 | ＋20 | 7 門指定科目須全部修畢 |
| **合計** | **149** | |

模組合併規則：

| 欄位 | 合併方式 |
|---|---|
| `totalCredits` | 相加 |
| `tags` | 串接（每個身分有自己的標籤，兩個輔系不會混在一起） |
| `categories` | 同 `id` 的大類合併 buckets，`minCredits` 相加 |
| `subjectGroups` | 串接 |

所以「加一個輔系」＝「多合併一個模組」，引擎其他部分完全不用改。移除身分時，掛該身分標籤的課會變成未設標籤（課程本身保留），判定結果會列出來提醒。

**自訂身分**：系統沒內建的輔系／雙主修／學分學程，可以在畫面上自己填名稱與學分，會即時產生一個專屬標籤與項目。

### 學分判定

```
課程 →（標籤）→ 項目 bucket →（歸屬）→ 五大類 → 畢業總學分
```

**一門課的學分只算進一個領域。** 歸屬完全由標籤決定：工程光學同時符合物理領域與電控學程選修，但標籤設成「物理領域」，那 3 學分就只給物理，專業學程一分都拿不到；改成「專業學程」則反過來。

科目判定那邊仍照原規則「排到就打勾」，但會標出這門課的學分實際落在哪個領域，避免看到「學程 5 門已達標」卻不懂為什麼學分只有 12/15。

| 大類 | 包含的標籤 |
|---|---|
| 校定必修 | 大學中文、英文領域、核心通識、一般通識 |
| 系定必修 | 系定必修、物理領域 |
| 專業學程 | 專業學程 |
| 其他選修 | 主修選修 |
| 其他身分 | 各身分模組帶進來的標籤（輔系、雙主修、學分學程⋯⋯） |

核心通識拆成「向度一～向度四」四個標籤，修課時要選對向度，引擎才判定得出「四個不同向度各至少一門」。

一門課只有一個標籤，所以沒有「一門課該算哪一類」的競合問題。需要處理的只有**額滿**：

**動機系的規則集沒有設任何學分上限。** 每個項目的 `minCredits` 是「至少要修到」的門檻，不是天花板：物理領域修了 9 學分，9 學分就全留在物理領域，顯示 9/6。

因此「認列學分」永遠等於「實修學分」，不會有學分憑空消失。超修的部分也不會自動去補其他項目的缺口——物理多修 3 學分，其他選修還是得自己修滿 20。

引擎本身仍支援上限機制，只是這份規則集沒用到。別的學校若需要，在項目上加這兩個欄位即可：

- `cap` — 這個項目最多認列幾學分
- `overflowTo` — 放不下的課自動改列到哪個項目

轉移一律以「整門課」為單位，不會把一門課的學分拆給兩個領域。

### 條件式規則

任何節點都可以寫 `when`，對應學生選的修業選項：

```js
{ when: { option: 'track', equals: 'control' } }   // 只在選電控學程時生效
```

沒選學程時，四個學程的科目群組都不會出現。

---

## 標籤是可編輯的

在「標籤設定」裡可以改名稱、顏色，以及**改這個標籤算進哪個項目**。所有編輯存在 `plan.tagEdits`，原始規則集不會被動到，匯出規劃時會一起帶走。

也可以新增自訂標籤（例：校外實習），指定它掛到哪個項目就會開始計分。

---

## 檔案更新注意事項

`index.html` 的 `data-build` 屬性與 `ui/main.js` 的 `BUILD` 常數必須一致。改動涉及新 DOM 元素時，兩邊要一起改版號，並且**整包檔案一起上傳**。

版號對不上時，畫面最上方會直接指出哪個檔案是舊的，其餘功能仍可運作，不會整頁掛掉。頁尾右下角也會顯示目前載入的版號。

## 新增一個系所或輔系

### 步驟

1. **複製範本**：`rulesets/_TEMPLATE.major.js` → 改名成 `major.你的系-114.js`
   （輔系／雙主修／學分學程改用 `rulesets/minor.qf.js` 當範本，`type` 填 `minor`／`doubleMajor`／`program`）
2. **填內容**：照範本裡的註解換成你的系的規定
3. **註冊**：在 `rulesets/index.js` import 進來，主修加到 `MAJORS`、額外身分加到 `IDENTITIES`
4. **檢查**：`node tests/check-rulesets.mjs`
5. **上傳**：整包檔案一起傳，按 Ctrl+Shift+R 重新整理

引擎和 UI 一行都不用改，下拉選單／勾選框會自動出現。

### 檢查工具

```bash
node tests/check-rulesets.mjs
```

會抓出這些問題並指名位置：

```
✗ 學分對不上：各大類加總 129，但 totalCredits 寫 132（差 -3）
✗ 科目引用了不存在的標籤：系定必修科目 › 微積分一 → tag.打錯的標籤
✗ when 引用了不存在的選項：電控學程 → when.option='trak'
```

也會驗算主修 ＋ 每個額外身分的所有組合，確認合併後不會撞名。

### 一份規則集要填什麼

| 欄位 | 說明 |
|---|---|
| `id` | 全域唯一，慣例 `major.系名-入學年` |
| `type` | `major` / `minor` / `doubleMajor` / `program` |
| `totalCredits` | 這個身分要求的學分。多個身分會相加 |
| `tags` | 標籤，一門課掛一個 |
| `categories` | 大類 → 項目 bucket → 每個 bucket 吃哪些標籤 |
| `subjectGroups` | 規定要修的科目清單 |
| `options` | 學生要自選、且影響規則的東西（分組、學程） |

各大類 `minCredits` 的總和要等於 `totalCredits`，檢查工具會幫你驗算。

### 常見寫法

**五選二**（至少修 2 門）

```js
{ id:'grp.pick', label:'物理相關課程（五選二）',
  rule:{ type:'atLeastCourses', n:2 },
  items:[ { name:'工程光學', credit:3, tag:'tag.physics' }, /* ... */ ] }
```

**核心必選 ＋ 選修若干門**（巢狀群組）

```js
{ id:'grp.track', label:'某某學程', groups:[
  { id:'grp.track.core', label:'核心（全選）', rule:{ type:'all' }, items:[ /* ... */ ] },
  { id:'grp.track.elec', label:'選修（2 門以上）', rule:{ type:'atLeastCourses', n:2 }, items:[ /* ... */ ] },
]}
```

**只有選某組別才適用**

```js
when: { option:'group', equals:'a' }   // 需在 options 裡先定義 id:'group'
```

**課名有別名／可抵免**

```js
{ name:'程式設計', credit:3, tag:'tag.dept', aliases:['計算機程式設計','程式設計一'] }
```

**項目內的額外檢核**

四種規則，範圍可用 `tag`（單一標籤）或 `tags`（多個標籤合計）：

```js
checks: [
  { type:'minCourses',      min:3,                          label:'至少 3 門' },
  { type:'minCoursesOfTag', tag:'tag.ge-core-1', min:1,     label:'向度一至少 1 門' },
  { type:'minCreditsOfTag', tags:['a','b'],      min:8,     label:'合計至少 8 學分' },
  { type:'minDistinctTags', tags:['d1','d2','d3','d4'], min:4, label:'四個向度各至少 1 門' },
]
```

`minDistinctTags` 看的是「涵蓋幾個不同標籤」而不是修幾門，用來表達「四個不同核心向度各至少一門」這種規定——修四門但全擠在同一向度不算數。

### 資料還沒核對完

先填上這兩個欄位，畫面會顯示橘色提醒，避免別人誤以為數字已經確認過：

```js
dataStatus: 'unverified',
dataNote: '課程資料尚未與系辦公告核對',
```

核對完刪掉即可。

### 注意事項

- **標籤 id 要夠獨特**。輔系會跟主修合併，撞名會被檢查工具擋下來，建議加系所代號（`tag.ee-dept`）。
- **大類 id 想合併顯示才取同名**。所有額外身分的項目都用 `cat.identity`，就會一起收在「其他身分」底下。
- **`minCredits` 是門檻不是上限**。修超過會照實顯示（例 9/6），不會被截掉。真要設上限才用 `cap`。

## 資料儲存

**預設不保存。** 每次開啟網站都是空白的，關掉或重新整理就會清空。排了課還沒匯出就要離開時，瀏覽器會跳出確認。

右上角的「自動保存（僅此瀏覽器）」勾選後，規劃會寫進 localStorage。要點：

- **只存在這個瀏覽器裡**，不會上傳。換裝置、換瀏覽器、開無痕視窗都看不到。
- 別的使用者用自己的裝置開這個網站，看不到你的規劃——各自的 localStorage 完全獨立。
- 唯一的例外是**共用電腦**：同一台機器、同一個瀏覽器設定檔，下一個人會看到。公用電腦用完記得取消勾選（會一併刪除已存的規劃）。
- 開關狀態本身也會記住，勾選一次之後就一直保持。

不管開關開或關，都可以用「匯出規劃」下載 JSON、用「匯入規劃」讀回來，這是跨裝置搬移的唯一方式。沒有後端，檔案不會上傳到任何地方。

畫面右下角的版本標記（例 `v6`）用來確認瀏覽器載入的是不是最新檔案。更新後如果標記沒變，多半是快取，按 Ctrl+Shift+R 強制重新整理。

## 判定結果不如預期時

判定結果最上方會列出例外狀況，先看那裡。常見三種：

| 症狀 | 原因 | 怎麼修 |
|---|---|---|
| 課排了但學分沒進對的領域 | 標籤被搬到別的項目 | 標籤設定 → 看「歸屬項目」欄，或按「還原所有標籤設定」 |
| 同一門課出現兩次 | 該課同時列在多個規定群組 | 刪掉多餘那筆（1.0 版的匯入會重複，已修正） |
| 學分顯示「溢出」 | 該項目設了 `cap` | 動機系規則集沒有上限，出現代表用到舊版檔案 |

因為預設不保存，開站時會自動清掉先前版本殘留在 localStorage 的資料，舊資料不會再冒出來。

## 操作備忘

- 待排池的卡片按 **×** 是刪除課程
- 學期表的卡片按 **↩** 是移回待排池，課程不會被刪掉（拖回左邊也一樣）
- 卡片上的下拉選單可以直接改標籤，改完學分立刻重新歸屬
- 頁面不保存資料，離開前記得「匯出規劃」

判定結果僅供規劃參考，實際畢業資格以系辦與教務處公告為準。
