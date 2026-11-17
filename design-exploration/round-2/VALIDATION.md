# 驗證紀錄 · Round 2

2026-11-17。範圍是首頁離線視覺探索，不是產品、列印、資料或完整無障礙驗收。Round 1 原紀錄完整保留在本文後半及 `round-1/VALIDATION.md`。

## 實際使用的技能與步驟

### design-exploration（工作目錄內版本）

- 重讀 `.agents/skills/design-exploration/SKILL.md`，依 **STEP 5：一輪一輪收斂** 執行。
- 沿用已建立的 STEP 2 R0 基準與 STEP 4 六個 R1，沒有重跑 Round 1、另造線框或改版面。
- 將「1–4 都還不錯」解讀為四版均可接受，未推定首選；五個 R2 每個都記錄父版、理由、差異與計算對比。
- `shutil.copy2` 先完整封存 21 個原頂層檔與 `shots/README.md` 至 `round-1/`。每個 R2 再由 `shutil.copyfile` 複製其第一父頁到新檔後修改，保留全部舊頁。
- 非互動條件下，把 Round 2 補充問題與假設答案寫入 QUESTIONS；未詢問色碼，未等待回答。
- **STEP 6 未執行**：尚未選定，不做產品實作，不宣稱最終 token 規格。

### ui-ux-pro-max（工作目錄內版本）

重讀 `.agents/skills/ui-ux-pro-max/SKILL.md`；需求分析確認為台灣家長／老師使用的靜態首頁、手機優先、同一版面。執行以下本地資料搜尋，未使用 `--persist` 或外部字型／套件：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "teacher productivity tool minimal" --design-system -p "Round 2 Home Exploration"
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "minimal flat editorial" --domain style -n 3
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "editorial blue pink" --domain color -n 3
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "Chinese traditional readable" --domain typography -n 2
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "text reflow layout stability" --domain ux -n 2
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "text reflow spacing" --domain ux -n 1
```

檢視了回傳的分類、排名與適用性。reflow 第一次 top result 為 chip collection，縮小搜尋後得到 Web Text Reflow and Spacing。採納／排除細節見 SOURCE-NOTES 的 Round 2 段落。讀取 `references/pro-rules.md` 的 native/mobile checklist 與 `references/quick-reference.md` 的 web 適用條目；沒有把 native 要求冒充網頁實測。純 HTML/CSS/JS 無相符 stack，未使用其他框架作替代。

## 實際執行的檔案與檢查命令

讀取／定位使用 `cat`、`sed`、`rg`／`rg --files`。編輯使用 `apply_patch` 與 `python3 -B` 的標準函式庫 `pathlib`／`json`／`shutil`，全部寫入 design-exploration。主要可重現命令：

```sh
python3 -B design-exploration/build-round2.py
python3 -B -m http.server 8765 --bind 127.0.0.1 --directory .
python3 -B design-exploration/verify-round2.py --serve-check
python3 -B design-exploration/round-1/verify.py
git diff --check
git diff --stat
git diff --exit-code -- . ':!design-exploration'
git status --short
```

`verify-round2.py` 是本資料夾的產物檢查器；沒有增加或修改產品測試。原 `verify.py` 未改，於封存資料夾執行，以符合它原本七版的檢查範圍。HTTP server 只監聽 loopback，沒有部署；檢查完已以 Ctrl-C 停止，觀察到 exit 0 與 `Keyboard interrupt received, exiting.`。

最後另外以 Python 內建 `compile` 檢查兩個新 Python 腳本語法（不寫入 bytecode）；掃描 `.agents/skills` 的 `.pyc` 數量為 0。`git diff --check` 通過。更新紀錄後重跑 R2 靜態與 HTTP 檢查，數量與下表一致。

另以 Python `shutil.which` 查詢 python3、node、google-chrome、chromium、chromium-browser、playwright：只有 python3 在 PATH。這不代表系統未安裝瀏覽器；未在工作目錄外搜尋或讀取安裝檔。CUA 實際呼叫 `cua.createBrowserTab("iab", 本機比較頁, {visible:true})` 回報 **The browser access host is unavailable**；沒有進入瀏覽器頁面，未宣稱 headless Chrome 啟動失敗（本輪未直接啟動 Chrome）。

## 實際通過的檢查

| 項目 | 觀察結果與主張範圍 |
| --- | --- |
| 歷史封存 | 21 個 Round 1 頂層檔案的 SHA256 與修改前記錄一致；原位 R0／全部六個 R1、共用 CSS／片段及舊生成／檢查器位元組不變。 |
| 原始資料 | `directions.json` 前七個物件與原 Round 1 完全相同；另附五個 R2，父版只取 R1-1～R1-4。 |
| 固定內容 | 五個 R2 各自包含一份逐字相同的 `screen.html`；沒有新增產品腳本、內容、資料或互動。 |
| 幾何預防 | 每個 R2 的七個字型／字重／字距 token 與 R0 完全相等，使用同一份未修改 `screen.css`。新規則除了自訂變數，只對三種既有卡內文字設定 `color`，探索說明 CSS 亦與原版一致。**不是 bbox 實測。** |
| 對照頁 | 靜態解析確認 12 個有標題的 sandbox iframe：R0、五個 R2、六個 R1；Round 2 在前、Round 1 在後，原 Round 1 比較頁另有入口。 |
| 引用與資源 | 24 個 HTML（含封存頁與片段）、141 個相對引用，檔案／錨點存在、id 無重複。沒有 @import、網路字型、圖片、CDN 或 npm 資源；R2 首頁無 script。此為靜態掃描，非 network log。 |
| 對比算術 | R2 100 組指定文字配對全部 ≥4.5:1；用保留的 Round 1 算式交叉核對，新結果誤差 ≤0.0005。黑白 21:1、同色 1:1 邊界通過。這是算術一致性檢查，不是獨立第三方無障礙驗收。 |
| 歷史檢查 | 封存版 verify.py 通過七版內容與原 119 組配對檢查；102 組 R1 達標、R0 原 6 組不足如實保留。 |
| 本機供檔 | 43 個連結資源回傳 HTTP 200 且內容與磁碟一致；包含新舊比較頁、全部 standalone 與其 CSS／JS／說明連結。 |
| 產品界線 | `git diff --exit-code -- . ':!design-exploration'` exit 0；status 中外部只見開始時已存在的 untracked `.agents/`。未修改 memory、產品測試或任何受保護功能。 |

## R2 色票計算

| 方向 | 父版本 | 詞庫按鈕 | 練習紙按鈕 | 20 組最低值 |
| --- | --- | ---: | ---: | ---: |
| R2-1 藍墨書房 | R1-1 + R1-4 | 7.408:1 | 8.891:1 | 5.915:1 |
| R2-2 莓紅印記 | R1-2 + R1-4 | 9.694:1 | 9.382:1 | 4.972:1 |
| R2-3 紫霧墨卡 | R1-3 + R1-4 | 8.510:1 | 10.926:1 | 5.864:1 |
| R2-4 藍莓雙奏 | R1-1 + R1-2 + R1-3 | 7.910:1 | 7.363:1 | 5.964:1 |
| R2-5 銀灰紫箋 | R1-4 + R1-3 | 12.706:1 | 8.337:1 | 5.630:1 |

完整配對存在 `contrast-round2.json`；每個 R2 也在 `directions.json` 的 `contrast` 欄位保存同一份結果。頁面展示按鈕、最小值與方法，未標成瀏覽器渲染量測。

20 組包含頁底正文／入口標題／說明／導覽／品牌、卡內課名／年級／提示、兩個入口與 hover 的文字、頁尾署名／來源連結／授權／作者／回饋／版權。R2-3 深色卡內使用獨立 `card-muted`，配對與實際 CSS 對應。沒有測 emoji、邊框、焦點、透明陰影／抗鋸齒或全套 WCAG。

## NOT MEASURED 與檢查頁

- **R0／R2 在 390px 與 1280px 的實際 bounding box 差異：NOT MEASURED。** 沒有聲稱所有元素已實測在 1px 內。
- 瀏覽器截圖、實際字型 fallback、文字折行／溢出、比較頁尺寸切換、縮圖裁切、視覺差異的人工觀察：NOT MEASURED。
- 直接 file 開檔行為、JavaScript runtime console、實際 network log、200% zoom、鍵盤／螢幕閱讀器與 iPhone／iOS Safari：NOT MEASURED。
- 原站與 R0 像素一致性、列印／PDF、考卷／解答、練習紙 A4、田字格、描紅、筆順或資料回歸：NOT MEASURED。沒有因為產品未改便宣稱已驗證輸出。
- Gavin 的最終選擇與使用者效果：尚未確認；「1–4 都還不錯」不是指定 R2 首選。

`layout-check.html`／`.js` 是獨立的、未執行的瀏覽器觀察頁，會在同一瀏覽器依序載入 R0 和五個 R2；以 390×900／1280×900 iframe、等待 fonts.ready 與兩個 animation frame，再比較所有 body 元素（含 body 本身、頁尾與探索說明）的 x／y／width／height。差異 >1px 列出元素、delta 和 FAIL；無瀏覽器、跨來源存取失敗或逾時時為 NOT MEASURED。此頁存在不等於執行成功；它也不替代使用者的外部 harness。

沒有使用／更動 `harness-shots/` 內容，也沒有把其中既有圖當作本輪證據。截圖限制另見 `shots/README.md`。未執行 commit、push、branch、checkout、reset、部署；未查其他分支／refs／remote history，沒有 wrangler／supabase／firebase／Cloudflare 操作。

---

# Round 1 原始紀錄（保留，以下狀態只屬於 Round 1）

# 驗證紀錄

2026-11-17。這是視覺探索的靜態與供檔檢查，不是產品功能或列印驗收。

## 實際使用的技能步驟

### design-exploration（僅工作目錄版本）

- 先列出 `.agents/skills/`，讀取其中兩份 `SKILL.md`；沒有讀其他位置的技能。
- 步驟 0：判定為整頁視覺方向，採完整發散流程。
- 步驟 1：非互動條件下將八題與已知答案／假設寫入 `QUESTIONS.md`。
- 步驟 2：讀取首頁 HTML／CSS／JS、現有課名；重建固定狀態基準，整理現況 token、尺寸與離線差異至 `SOURCE-NOTES.md`。
- 步驟 3：版面已被 Owner 接受，跳過線框圖，不提新版面。
- 步驟 4：以其 `templates/comparison.html` 的基準／方向陣列／共用內容／寬度切換模式為起點，產出 R0 + 六個 R1；每版含理由、差異、取捨、字體處理及色彩對比計算。
- 步驟 5：等待 Gavin 看圖選方向；未進入收斂。現有版本全部保留。
- 步驟 6：未執行產品實作。沒有將方向套進產品 CSS／JS。

### ui-ux-pro-max（僅工作目錄版本）

實際執行的搜尋如下。每一行均加上 `PYTHONDONTWRITEBYTECODE=1`，避免技能目錄產生 `__pycache__`。沒有使用 `--persist`，也沒有新增依賴。

```sh
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "education parent teacher tool" --design-system -p "Chinese Writing Practice Exploration"
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "minimal flat swiss accessible" --domain style -n 5
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "education productivity monochrome" --domain color -n 5
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "Chinese traditional readable" --domain typography -n 4
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "teacher productivity tool minimal" --design-system -p "Parent Teacher Workbench"
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "education children" --domain color -n 3
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "bold monochrome neumorphism flat" --domain style -n 4
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "geometric rounded technical" --domain typography -n 3
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "flat design" --domain style -n 1
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "minimal monochrome" --domain color -n 1
```

逐一閱讀回傳類別與適用性；對不符合的兒童 Claymorphism／Neumorphism 縮小重試；不採用綠色色票和所有外部字型連結。採納細節記於 `SOURCE-NOTES.md`。讀取 `references/pro-rules.md`，辨識其 native 範圍，並以 `references/quick-reference.md` 第 1–3 類作網頁適用的靜態檢查：對比、標籤、可見焦點、減少動態與無外部字型資源。未使用 stack 搜尋，因專案是純 HTML/CSS/JS + Bootstrap，資料庫沒有精確對應的 stack，不冒充 Tailwind。

## 產出與輕量檢查命令

```sh
python3 -B design-exploration/build.py
python3 -B scripts/preview.py
python3 -B design-exploration/verify.py --serve-check
git diff --stat
git diff --exit-code -- . ':!design-exploration'
git status --short
```

另以 Python `shutil.which` 查詢 `python3`、`node`、`google-chrome`、`chromium`、`chromium-browser`、`playwright`；只有 `python3` 找到可用命令。沒有執行可寫到 `docs/` 的 review fixtures，也沒有執行產品測試。

## 實際結果

| 檢查 | 結果與可主張範圍 |
| --- | --- |
| 產生器 | 成功產生七份獨立畫面、比較頁與視覺 token；無 build 即可閱讀產出。 |
| 共用內容 | 七版都包含同一份 `screen.html`，字串一致；共用幾何 CSS。只對視覺 token 做各版覆寫。 |
| 相對引用 | 所有 HTML 的 href／src 限定資料夾內的相對路徑；連結與錨點存在、沒有重複 id。 |
| 資源界線 | 靜態掃描無 CDN／外部字型／圖片／@import；七份畫面沒有 script，comparison.js 沒有 fetch、storage 或資料 API 呼叫。這不替代瀏覽器 network log。 |
| 對比 | 119 組配對重新計算，102 組 R1 配對全部 ≥4.5:1；R0 保留 6 組不足。驗證黑白 21:1、同色 1:1 邊界。 |
| localhost 供檔 | `verify.py --serve-check` 對比較頁及所有 HTML 引用的本地資源檢查 HTTP 200 與回傳位元組一致。 |
| 產品差異 | `git diff --exit-code` 成功，受追蹤產品檔案沒有差異；`git status --short` 僅原本的 `.agents/` 與新增的 `design-exploration/`。 |
| 技能目錄副作用 | 掃描沒有產生 `.pyc` 檔案。 |

第一版臨時靜態掃描因 comparison.js 註解含「fetch」一字觸發失敗，未作通過宣告。將掃描限制到排除註解後的程式，再以 `verify.py` 重跑；沒有更動產品或忽略真實 API 呼叫。

| 方向 | 17 組指定字色最小對比 | 不足 4.5:1 組數 |
| --- | ---: | ---: |
| R0 現況 | 2.256:1 | 6 |
| R1-1 晴空藍 | 5.710:1 | 0 |
| R1-2 莓果日常 | 5.829:1 | 0 |
| R1-3 紫藤留白 | 5.603:1 | 0 |
| R1-4 墨白編輯 | 5.546:1 | 0 |
| R1-5 鉛筆黃 | 6.183:1 | 0 |
| R1-6 夜讀靛藍 | 7.878:1 | 0 |

這些數字是指定前景／背景色票的 sRGB 計算，不包含 emoji、邊框、焦點、抗鋸齒、實際字型、明暗適應或整個畫面的無障礙驗收。未聲稱符合整套 WCAG。

## NOT MEASURED

- CUA 開啟本機頁面回報 `The browser access host is unavailable`；沒有可用的瀏覽器截圖。
- 390px／1280px 真實 render、文字折行、畫面溢出、縮圖裁切與兩種模式的實際操作。
- 直接 file 開檔的瀏覽器觀察、實際網路請求紀錄、JavaScript runtime console。
- 原站與 R0 的像素一致性；外部 Bootstrap 細節、實際 fallback 字型。
- 螢幕閱讀器、鍵盤實際焦點順序、200% zoom、iPhone／iOS Safari、Windows Chrome。
- 列印／PDF、考卷、解答、練習紙 A4、田字格與描紅的輸出回歸。產品程式未改，不等於量測過輸出。
- Gavin 的偏好、最終選擇與使用者測試。

未執行 commit、push、branch、checkout、reset、部署，未查看其他分支、refs 或 remote history；未執行 wrangler／supabase／firebase 或 Cloudflare 操作。
