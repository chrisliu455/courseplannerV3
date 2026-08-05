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
  subject.js              科目判定
  credit.js               學分判定
  ruleset.js              索引、標籤編輯套用、規則集健檢

rulesets/               各系所規定（純資料，沒有程式邏輯）
  dongji-113.js           動機系 113 學年
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
import { evaluate } from './engine/index.js';
import ruleset from './rulesets/dongji-113.js';

const report = evaluate(plan, ruleset);
```

### 輸入 `plan`

```js
{
  rulesetId: 'dongji-113',
  options:   { track: 'control', minor: 'qf' },   // 學生選的身分
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
| 其他身分 | 輔系、學分學程（不計入畢業總學分） |

一門課只有一個標籤，所以沒有「一門課該算哪一類」的競合問題。需要處理的只有**額滿**：

- `cap` — 這個項目最多認列幾學分（例：物理領域最多 6）
- `overflowTo` — 超出的學分自動改列到哪個項目（例：溢到其他選修）

物理修了 3 門 9 學分 → 物理領域認 6，其他選修認 3，判定結果會標示「溢出」。

### 條件式規則

任何節點都可以寫 `when`，對應學生選的身分：

```js
{ when: { option: 'track', equals: 'control' } }   // 只在選電控學程時生效
{ when: { option: 'minor', truthy: true } }        // 有輔系才生效
```

沒選輔系時，輔系項目自動關閉；如果有課掛著輔系標籤，會被列在「未啟用」提醒裡。

---

## 標籤是可編輯的

在「標籤設定」裡可以改名稱、顏色，以及**改這個標籤算進哪個項目**。所有編輯存在 `plan.tagEdits`，原始規則集不會被動到，匯出規劃時會一起帶走。

也可以新增自訂標籤（例：校外實習），指定它掛到哪個項目就會開始計分。

---

## 新增一個系所

1. 複製 `rulesets/dongji-113.js` 改成你要的內容
2. 在 `rulesets/index.js` import 進來、加到 `RULESETS`

下拉選單會自動出現，**引擎和 UI 一行都不用改**。

規則集寫錯時（標籤沒歸屬、溢出目標不存在、bucket id 重複⋯⋯），引擎的健檢會把問題列在判定結果最上方，不會默默算錯。

---

## 資料儲存

規劃存在瀏覽器的 localStorage，沒有後端、不會上傳。換裝置請用「匯出規劃」下載 JSON 再匯入。

判定結果僅供規劃參考，實際畢業資格以系辦與教務處公告為準。
