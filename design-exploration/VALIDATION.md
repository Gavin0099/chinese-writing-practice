# 驗證紀錄 · Round 3 短名單

2026-11-17。只處理 `design-exploration/`；STEP 5 收斂至 R0-0 + R3-1 + R3-2，尚未定案。以下 PASS 僅指實際完成的保存、資料、連結、HTTP 與語法檢查。**修正後的真實 bbox 與 r3Metrics 仍為 NOT MEASURED。**

## 依據、修正與驗證計畫

- Owner 明確指定：「1和2就好 其他去掉」；短名單順序為 R0-0、R3-1、R3-2，其他版本封存不刪除。父版鏈完整保留。
- **修正前、由 Owner 提供的 harness 證據**：headless Chrome 的 390px／1280px 中，R3-1／R3-2 `.task-primary` 比 R0 高 16px，其他 49 個元素相同；`r3Metrics` 為 `NEEDS REVIEW`。本輪未重新觀察該量測，不將它當成本輪新實測。
- 原始程式對所有 target 設定 width／min-width／max-width 及 height／min-height／max-height。實際讀到 `screen.css` 的入口 p 為 `margin: .5rem 0 1rem`，外層 div 沒有指定高度。固定高度破壞最後子元素的底部 margin collapse。
- **修正**：`typography-round3.js` 對 `.home-task-entry > div` 不寫任何高度約束，只保留原寬度／行高校準；最後 p 的 margin 仍可折疊穿過外層。所有其他 target 的盒子限制與原文字擬合流程不變。不硬補 16px、不改字型／文案／margin。
- 修正由四個封存 R3 共用。修正前 JS 的原始副本在 `archive/round-3/typography-round3.js`；封存預覽仍讀取根目錄修正後的共用 JS，已在 README 和 archive/README 明示。
- 低風險 L1 的驗證分兩層：以搬移前 SHA256、原始資料與 Owner 指定三版核對交付；以真正 R0 作瀏覽器幾何預期，逐一比較所有元素。沒有域邏輯、持久化或產品 API 變更，無資料遷移／部署測試。

## 實際技能、操作與命令

重讀本工作目錄的 `.agents/skills/design-exploration/SKILL.md` 與 `.agents/skills/ui-ux-pro-max/SKILL.md`。`design-exploration` 僅執行 STEP 5；依明確短名單需求，沒有再產生約五個新方向、重新提八題或執行 STEP 6。

UI UX Pro Max 使用針對性檢索：

```sh
python3 -B /Users/macminim4/agent-ab/runs/cwp-dexp-1117/b/.agents/skills/ui-ux-pro-max/scripts/search.py 'text reflow spacing' --domain ux -n 1
```

結果為 `ux / Accessibility / Text Reflow and Spacing / Web`，與本題相符；採納內容自動高度、避免固定高度造成文字問題的建議。沒有重新選色、重跑 design-system、下載字型、安裝套件或使用不相符的 stack。字型平台預期依 Owner 指定寫入，未做外部字型盤點。

搬移／寫檔使用 `python3 -B` 的 pathlib／shutil／json 及 `apply_patch`；先記錄雜湊、封存原比較與資料，再修改。所有輸出在 design-exploration。驗證命令：

```sh
python3 -B -m http.server 8765 --bind 127.0.0.1 --directory .
python3 -B design-exploration/verify-shortlist.py --serve-check
```

另用 Python 內建 `compile()` 檢查新 verifier 語法，沒有寫 bytecode。Node REPL 將五個 JS 原始碼放入未執行的函式宣告做語法解析；這是 parsing PASS，不是 DOM runtime 或瀏覽器量測。

## 實際觀察結果

| 檢查 | 結果與主張範圍 |
| --- | --- |
| 三個保留頁與資源 | `r0-current.html`、`r3-1-bluebold.html`、`r3-2-berryround.html` 與搬移前 SHA256 一致；screen.html／screen.css、兩輪 themes CSS、typography-round3.css 與原比較 CSS／JS 也不變。R3-2 圓體 stack 未改。 |
| 舊快照搬移 | round-1／round-2 整批搬至 archive，81 份檔案的 SHA256 全部相同，包括其中原有重複快照。未刪除歷史檔案。 |
| 15 個版本搬移 | 六個 R1、五個 R2、四個未入選 R3 均只在 archive 主要路徑保留；反向還原相對連結後，SHA256 與原檔一致，證明只有 href／src 調整。 |
| Round 3 比較副本 | archive/round-3/comparison.html 仍有 18 欄；反向還原路徑後雜湊等於修改前的 comparison.html。已留原文件／資料與校準程式副本。 |
| 目前短名單 | 靜態解析只有依序 R0-0、R3-1、R3-2 三個有 title 的 sandbox iframe；id 無重複；兩條完整父版鏈存在。三欄 CSS 同時適用 390／1280 模式，實際畫面尚未量測。 |
| 方向資料 | 根目錄 directions／round2-directions／round3-directions 保留 18／5／6 筆、原順序與字型／色票／對比值。新增短名單狀態和實際 page；六個 R3 的 geometry_strategy 更新為修正後描述。三份資料一致。 |
| 封存索引 | archive/README.md 列出 15 版的 id、名稱、輪次、父版、封存原因，另逐一列出快照中的版本副本與連結。 |
| 引用檢查 | 57 份 HTML、354 個 HTML href／src 有效，id 無重複；另核對 README、封存索引、Round 3 歷史文件與 layout-check JS 動態頁面路徑。 |
| 檢查器負向案例 | 錯誤入選版本、缺少檔案、外部 URL、超出探索目錄的路徑、不存在的錨點，都會被拒絕；fixture 僅在記憶體，未寫產品檔。 |
| 本機 HTTP | 113 個檢查範圍內資源皆回傳 HTTP 200，位元組等於磁碟內容。只監聽 127.0.0.1，沒有部署；檢查後已送 Ctrl-C，觀察到 Keyboard interrupt received, exiting. 與 exit 0。 |
| 語法 | verify-shortlist.py 的 Python compile 通過；typography-round3.js、layout-check-round3.js、layout-check.js、comparison-round3.js、archive/round-3/layout-check-round3.js 的 JS parsing 通過。未執行其中的 DOM 邏輯。 |

第一次檢查在舊 README 仍指向搬移前 `round-2/comparison.html` 時失敗；沒有把該次當作通過。更新 README 至本輪短名單後重跑，上表為完整通過結果。檔案／HTTP 檢查不等於封存頁視覺完全相同，也不證明 margin 修正在實際瀏覽器已成功。

## 瀏覽器缺口：NOT MEASURED

本輪實際呼叫 `cua.createBrowserTab("iab", "http://127.0.0.1:8765/design-exploration/comparison.html", {visible:true})`，回報 **The browser access host is unavailable**。未直接啟動 headless Chrome，未在工作目錄外讀取或搜尋瀏覽器／字型。

- 修正後 R3-1、R3-2 在 390×900／1280×900 的每個 border box、按鈕 y、最大 delta、實際換行／溢出，以及 `window.r3Metrics` 是否由 NEEDS REVIEW 變為 FITTED：**NOT MEASURED**。
- 三欄視覺排列、縮圖裁切、橫向捲動、390／1280 切換、所有封存頁的實際渲染、直接 file 開檔與 screenshot：**NOT MEASURED**。
- Windows Chrome／iPhone Safari 的實際字型與圓體 fallback、200% zoom、使用者文字間距覆寫、鍵盤／螢幕閱讀器及 runtime console／network log：**NOT MEASURED**。
- 原產品、列印／PDF、考卷／解答、A4、田字格、描紅、筆順、資料與同步：未測；這次沒有修改或接入它們，不能據此宣稱輸出測試通過。

缺口風險：所述 margin collapse 修正仍需在實際字型與 layout engine 下驗證。補足條件：讓外部 harness 或可用瀏覽器執行 [layout-check-round3.html](layout-check-round3.html)，兩個寬度下對 R0 逐項比較，要求所有 x／y／width／height 完全相等（容差 0px）、文字換行一致、r3Metrics.status 為 FITTED 且沒有新增 overflow。原本 1px 檢查頁已收斂為兩版與嚴格相等；不更改 calibration 本身的既有報告閾值來製造 PASS。

**目前未宣稱幾何驗收通過或最終設計定案。** Windows Chrome／iPhone Safari 預設沒有繁中圓體、很可能退回黑體的說明已同時放在 README 與 comparison；stack 不改，裝置實測仍為 NOT MEASURED。

沒有讀寫 `harness-shots/`，沒有修改產品、memory、PLAN、治理或技能檔案，沒有 commit／push／branch／checkout／reset、遠端歷史查詢或部署。沒有啟動 session closeout。本輪紀錄都在此探索資料夾。

---

# 以下為 Round 3／2／1 歷史紀錄

下文保存當時的結論、路徑與數量，不套用到目前短名單。歷史完整文件也在 [archive/round-3/](archive/round-3/README.md)、[archive/round-2/](archive/round-2/README.md)、[archive/round-1/](archive/round-1/README.md)；目前狀態以上方短名單紀錄為準。

# 驗證紀錄 · Round 3

2026-11-17。只驗證 `design-exploration/` 內的字體探索交付物。以下 PASS 都限定於檔案、算術、語法或本機供檔，**沒有瀏覽器幾何／字體實測 PASS**。Round 2／1 原紀錄在本文後方，修改前完整檔案也封存在 `round-2/`。

## 實際技能、步驟與命令

重讀工作目錄內 `.agents/skills/design-exploration/SKILL.md` 與 `.agents/skills/ui-ux-pro-max/SKILL.md`。沒有讀工作目錄外的技能或專案檔案。

- **design-exploration STEP 5**：沿用 STEP 2 基準及 STEP 4 歷史，依 Owner 選出的 R2-1、R2-2、R2-4 各複製兩個新變化；六版記錄來源、標題／正文、理由、最大差異與對比。非互動的八題假設寫入 QUESTIONS。沒有重跑線框、沒有選定勝出者、沒有 STEP 6 產品實作。
- **ui-ux-pro-max Step 1／Step 3 與 Query Contract**：需求聚焦字體，使用 explicit typography／ux domain；檢視分類、排名及繁中／成人操作者的適用性。不是新頁／新配色系統，沒有重跑 `--design-system`、`--persist` 或不相符的 stack。採納／拒絕理由見 SOURCE-NOTES。

本輪實際執行的搜尋（均以完整工作目錄路徑呼叫，避免技能目錄出現 bytecode）：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -B /Users/macminim4/agent-ab/runs/cwp-dexp-1117/b/.agents/skills/ui-ux-pro-max/scripts/search.py 'Chinese traditional readable' --domain typography -n 3
PYTHONDONTWRITEBYTECODE=1 python3 -B /Users/macminim4/agent-ab/runs/cwp-dexp-1117/b/.agents/skills/ui-ux-pro-max/scripts/search.py 'rounded friendly education' --domain typography -n 3
PYTHONDONTWRITEBYTECODE=1 python3 -B /Users/macminim4/agent-ab/runs/cwp-dexp-1117/b/.agents/skills/ui-ux-pro-max/scripts/search.py 'text reflow spacing' --domain ux -n 1
```

讀取／定位使用 `rg --files`、`cat`、`sed`；寫入使用 `apply_patch`、shell heredoc 及 `python3 -B` 的 pathlib／json／shutil。先封存再生成，所有輸出都在 design-exploration。主要執行命令：

```sh
python3 -B design-exploration/build-round3.py
python3 -B -m http.server 8765 --bind 127.0.0.1 --directory .
python3 -B design-exploration/verify-round3.py --serve-check
git diff --check
git diff --exit-code -- . ':!design-exploration'
git status --short
```

另以 Python 內建 `compile` 檢查兩個新 Python 檔案，未寫 bytecode。使用 Node REPL 工具對三個新 JS 的原始碼做函式宣告解析（不執行 DOM 程式），結果 syntax PASS；這不是 browser runtime 證據。最初嘗試 `new Function(source)` 被工具的字串 code generation 限制拒絕；沒有把該次失敗算作通過，改用工具正常的靜態函式宣告解析。沒有安裝 npm／pip 套件，也沒有修改產品測試；最後掃描 .agents/skills 的 .pyc 為空。

## 實際檢查結果

| 項目 | 觀察結果與主張範圍 |
| --- | --- |
| 原樣封存 | `round2-preservation.json` 的 59 份 SHA256 與 `round-2/` 全部一致；目前除了六個獲准更新的總覽／說明檔外，其餘 53 份舊檔雜湊一致。 |
| 歷史資料／總覽 | `directions.json` 是原 12 個物件加六個 R3。比較頁 18 個 iframe、id 無重複，Round 3 → Round 2 → Round 1，R0 第一欄；每個新卡都有父版及字體明細。 |
| 固定內容與結構 | 六個 R3 各含一份逐字相同的 `screen.html`；body 內 51 元素與 R0 標籤順序一致。幾何 CSS 與舊頁未改。**不等於 bbox 通過。** |
| 複製與字型資料 | 每個 R3 源自指定 R2 父頁；色票及基準 metrics token 等於父版；完整標題／正文 chain、Windows／iPhone notes 都存在，字型下載均為 0 bytes。 |
| 色彩對比 | 6×20＝120 組重新計算；全部 ≥4.5:1，與既有 R2 父版對比一致。黑白 21:1、同色 1:1，以及固定參考 #777777／白 4.478089453577214（低於 4.5）驗證算術。不是渲染採樣或整套 WCAG 驗收。 |
| 檢查器失敗案例 | 在記憶體中修改課名、提供外部資源網址、提供不存在的本機引用，三種情況都被拒絕。沒有為這些 fixture 寫產品檔。 |
| 引用與資源 | 95 個可由 HTML 到達的本機資源引用有效；六版與新 CSS／JS 沒有 @font-face、@import、url 字型、外部請求或 storage。這是靜態檢查，非 network log。 |
| HTTP | 95 個資源實際回傳 HTTP 200，回傳位元組與磁碟一致。只監聽 loopback，不是部署；驗證後已送 Ctrl-C，觀察到 exit 0 與 Keyboard interrupt received, exiting.。 |
| 語法 | 2 個 Python 檔 compile、3 個 JS 檔靜態函式宣告解析通過；未跑 DOM／瀏覽器 runtime。 |
| 寫入界線 | `git diff --exit-code -- . ':!design-exploration'` exit 0；status 中外部只有使用者已說明的 untracked `.agents/`。沒有改 memory、PLAN、fonts、產品或測試。 |

`verify-round3.py` 是探索檔案的驗證器，不是產品 test suite。它從凍結的歷史物件／SHA256 與原始 HTML 片段取得 expected，不以 R3 的產出反推自己應通過。瀏覽器觀察頁則另外讀真正的 `r0-current.html` 作幾何預期；校準程式自身說 FITTED 也不能替代外部 R0 比較。

## 各版對比

| 方向 | 父版 | 詞庫按鈕 | 練習紙按鈕 | 20 組最低 |
| --- | --- | ---: | ---: | ---: |
| R3-1 藍墨粗黑 | R2-1 | 7.408:1 | 8.891:1 | 5.915:1 |
| R3-2 莓果圓讀 | R2-2 | 9.694:1 | 9.382:1 | 4.972:1 |
| R3-3 藍墨明讀 | R2-1 | 7.408:1 | 8.891:1 | 5.915:1 |
| R3-4 藍莓楷語 | R2-4 | 7.910:1 | 7.363:1 | 5.964:1 |
| R3-5 莓紅書頁 | R2-2 | 9.694:1 | 9.382:1 | 4.972:1 |
| R3-6 藍莓輕圓 | R2-4 | 7.910:1 | 7.363:1 | 5.964:1 |

完整配對在 `contrast-round3.json`、`round3-directions.json` 與總 `directions.json`。配對包含頁底正文、標題、導覽、品牌、卡內文字、兩個主要按鈕及 hover、授權／來源／作者／回饋／版權；不包含 glyph 抗鋸齒、emoji、邊框、焦點與使用者辨讀效率。

## NOT MEASURED 與缺口

實際呼叫 `cua.createBrowserTab("iab", "http://127.0.0.1:8765/design-exploration/comparison.html", {visible:true})` 回報 **The browser access host is unavailable**。`shutil.which` 查 PATH 只找到 python3，node、google-chrome、chromium、chromium-browser、playwright 都為 None。這不代表整台機器沒裝瀏覽器；沒有去工作目錄外找應用程式、讀字型檔或直接啟動 headless Chrome。Node REPL 工具可做語法檢查，與本機是否有 Node CLI 是不同證據。

- **390×900／1280×900 每個 R3 與 R0 的實際 bbox、最大 delta、1px 門檻：NOT MEASURED。**
- 同裝置 R0 度量校準、保留折行、resize 重算、字型載入後重算、新增 overflow 偵測的瀏覽器執行：NOT MEASURED。
- 真實字形、圓體／楷體有無、Windows Chrome／iPhone Safari fallback、閱讀舒適度、視覺差異及截圖：NOT MEASURED。
- 比較頁切換、直接 file 開啟、JavaScript console、network log、200% zoom、文字間距覆寫、螢幕閱讀器：NOT MEASURED。
- 原站像素一致性、列印／PDF、考卷／解答、A4、田字格、描紅、筆順、資料或產品功能回歸：未執行、NOT MEASURED；產品未改不是測試通過。
- Owner 最終選擇尚未提供；喜歡三個 R2 不代表指定某個 R3。

缺口風險：不同系統字型與 inline／flex 字體度量仍可能改變顯示，固定 box 不代表字形一定完整。補足條件：可用瀏覽器實際開啟 `layout-check-round3.html`，檢查兩個寬度全部元素 delta、原文字換行與 overflow，並在 Windows Chrome／iPhone Safari 人眼核對；在這之前不宣稱幾何或實機驗收完成。

本輪未產生截圖；沒有讀取／寫入 `harness-shots/` 檔案，也沒有把其既有內容當作證據。沒有 git commit／push／branch／checkout／reset、其他 refs／remote history 或部署操作。所有受保護輸出與資料系統均未接入預覽。依 Owner 的硬限制未寫 memory，也沒有啟動 session closeout。

---

# 以下為 Round 2／1 原始紀錄（保留，狀態不套用至 Round 3）

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
