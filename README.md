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
  major.dongji-113.js     主修：動機系 113 學年（129 學分）
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
| 主修 動機工程學系 | 129 | 校定必修 30 ＋ 系定必修 64 ＋ 專業學程 15 ＋ 其他選修 20 |
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

| 大類 | 包含的標籤 |
|---|---|
| 校定必修 | 大學中文、英文領域、核心通識、一般通識 |
| 系定必修 | 系定必修、物理領域 |
| 專業學程 | 專業學程 |
| 其他選修 | 主修選修 |
| 其他身分 | 各身分模組帶進來的標籤（輔系、雙主修、學分學程⋯⋯） |

一門課只有一個標籤，所以沒有「一門課該算哪一類」的競合問題。需要處理的只有**額滿**：

- `cap` — 這個項目最多認列幾學分（例：物理領域最多 6）
- `overflowTo` — 超出的學分自動改列到哪個項目（例：溢到其他選修）

物理修了 3 門 9 學分 → 物理領域認 6，其他選修認 3，判定結果會標示「溢出」。

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

## 新增一個系所或輔系

**主修**：複製 `rulesets/major.dongji-113.js`，改內容，在 `rulesets/index.js` 加到 `MAJORS`。

**輔系／雙主修／學分學程**：複製 `rulesets/minor.qf.js`，改內容，加到 `IDENTITIES`。要點：

- `totalCredits` 是這個身分**額外**要求的學分
- 大類 `id` 用 `'cat.identity'`，這樣多個身分會收在同一個「其他身分」底下
- 標籤 id 要全域唯一（例 `tag.minor-qf`），合併時撞名會被健檢擋下來

下拉選單會自動出現，**引擎和 UI 一行都不用改**。

規則集寫錯時（標籤沒歸屬、溢出目標不存在、bucket id 重複⋯⋯），引擎的健檢會把問題列在判定結果最上方，不會默默算錯。

---

## 資料儲存

規劃存在瀏覽器的 localStorage，沒有後端、不會上傳。換裝置請用「匯出規劃」下載 JSON 再匯入。

判定結果僅供規劃參考，實際畢業資格以系辦與教務處公告為準。
