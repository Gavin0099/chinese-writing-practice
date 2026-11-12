# Phase 2：驗證紀錄與未驗項目

2026-11-12，macOS。產品基準 `901cb8d`；Phase 2 開始 HEAD `0c61648b8d6b4efce0d9007473dbc56d1e717b61`。本次修改的 12 個產品檔在兩個基準間完全相同。未建立 commit、push、PR、合併或部署。

**結論：介面實作與來源邊界檢查已完成，執行環境不足，不能宣稱全數驗收或 29 項測試通過。**

## 實際執行

| 檢查／方法 | 結果與限制 |
| --- | --- |
| `command -v node`；`node --test tests/*.test.mjs` | Node 不在本機 PATH；後者 exit 127，`zsh:1: command not found: node`。29 項測試 **NOT RUN**；未安裝 Node 或 npm 相依，未改 tests。 |
| `python3 scripts/preview.py` | 啟動 `http://127.0.0.1:8765/`。以 Python urllib 讀取 index、vocabulary、learning、exam、backup、sync，六頁 HTTP 200，回應與磁碟原檔 byte 相同。這不是 JS 執行驗收。 |
| `Google Chrome --version` | `Google Chrome 157.0.8103.51`。本機為 macOS，不能代稱 Windows Chrome。 |
| Chrome headless screenshot | 使用指定 binary、獨立 profile、`--headless --no-first-run --no-default-browser-check --window-size=390,844 --screenshot=...` 開首頁；exit 134，沒有診斷文字或截圖。未取得 after、computed styles 或 bounding rect。沒有關閉安全防護來重試。 |
| 原生／瀏覽器工具 | Inventory 回報 `The browser access host is unavailable`；取得原生 Chrome 時回報 `Computer Use was not approved to use Google Chrome`。未繞過工具限制。 |
| 基準畫面 | 透過 image viewer 檢視 `mobile-01-home-first-visit.png`、`mobile-04-vocabulary-loaded.png`、`desktop-04-vocabulary-loaded.png`。這是起點已有圖片，不是本次重現的執行結果。見 COMPARISON.md。 |
| HTMLParser 來源檢查 | 六頁原有 ID 全保留且無重複；具 name 的 input/select/textarea 之 form ownership、type/value/min/max/maxlength/pattern/required/disabled/multiple/autocomplete 不變；無巢狀 form；所有靜態 ARIA ID 及片段錨點都可解析。不是瀏覽器 HTML 引擎或 accessibility tree 測試。 |
| 操作順序來源檢查 | 詞庫 DOM 順序確為 examForm／examList → batchForm → wordForm；seed 仍在 examForm 的未 disabled details 內。以焦點導覽的新增 listener 不觸發 submit/reset/persist。 |
| 列印／資料逐 byte 比對 | `exam.html`、`exam.css`、`exam.mjs`、`examData.mjs`、`vocabularyData.mjs`、`backupData.mjs`、`learningData.mjs`、`cloudStorage.mjs`、`cloudConfig.mjs`、`googleAuth.mjs`、`characterLookup.mjs`、`char_data.js`、`db_core.js`、`storageManager.js` 共 14 檔完全相同。 |
| 練習紙隔離檢查 | `#previewSection` 子樹與 `#sheets-container` 全部祖先 tag/attributes 相同；`script.js` 自 `function initApp()` 起至檔尾逐 byte 相同（包含所有 worksheet rendering／export 路徑）。新首頁入口在既有列印隱藏的 `.hero-section > .container:not(#legacyControls)` 內。 |
| CSS 媒體邊界 | 三份 CSS 的原始完整內容都保留為 byte-identical prefix；解析新增區塊的頂層媒體條件，全為 `@media screen`。未改既有 print block、全域字型、worksheet selector 或 exam renderer。 |
| 詞庫核心函式 | `persist`、`fillBlanks`、`discardEditor`、`editWord`、`examSettings`、`renderExams` 的來源與基準完全相同；逐 hunk 核對其他變更只涉及文案、顯示狀態及導覽。 |
| `git diff --check`／`git diff --name-only` | 無 whitespace 錯誤。產品變更僅 12 個 UI 檔；沒有修改禁止目錄、既有 docs、資料／教材／治理檔。 |

本次 87 項靜態來源斷言通過；不是 87 項功能測試。預覽伺服器已用 Ctrl-C 停止，失敗 Chrome 的測試 profile 已清除。

靜態檢查的本次暫存腳本與原始輸出保留於 ignored 的 `artifacts/runtime/ux-task2/verify_static.py`、`static-results.txt`，**不提交 artifacts**。腳本使用 Python stdlib 的 HTMLParser、urllib、subprocess 讀取 Git 基準；不執行任何 JS。腳本的 `HEAD` 指 Phase 2 起點，若在 harness 提交後重跑，應改用上列完整起點 SHA；不可用候選 HEAD 自比來聲稱通過。

可重複的最小來源邊界檢查：

```sh
git diff --check
git diff 901cb8d -- exam.html exam.css exam.mjs examData.mjs vocabularyData.mjs backupData.mjs learningData.mjs cloudStorage.mjs cloudConfig.mjs googleAuth.mjs characterLookup.mjs char_data.js db_core.js storageManager.js
git diff 0c61648b8d6b4efce0d9007473dbc56d1e717b61 -- memory/ governance/ ai-governance-framework/ work/ tests/ scripts/ supabase/ data_engineering/ fonts/ stroke-svg/ AGENTS.md AGENTS.base.md CLAUDE.md GEMINI.md PLAN.md contract.yaml .gitignore docs/ux-task2/ISSUES.md docs/ux-task2/PLAN.md
```

上述兩個範圍 diff 應無輸出；這只能確認未變更，不能證明執行正確。

## 核心任務與驗收

狀態以**完整使用／驗收證據**判定。介面已實作但缺執行證據者標 partial；不把 CSS 宣告當成量測。

| 項目 | 狀態 | 證據／缺口 |
| --- | --- | --- |
| T1 進入老師詞庫 | done（入口實作） | 首頁 header、首次設定及主內容均有真正的 vocabulary.html 連結，主內容入口先於推薦卡；不需要登入或選年級。 |
| T2 單筆／批次新增 | partial | 原表單／欄位與邏輯保留，批次置前、捷徑展開並聚焦；實際輸入、混合錯誤列、儲存／重開未執行。 |
| T3 既有詞庫出卷 | partial | 出卷／歷史在新增區前，seed 保持 form ownership，抽題核心逐 byte 不變；真正產生／重開未執行。 |
| T4 本機／雲端保存理解 | partial | 已依 cloud 開啟結果及原成功分支顯示保存位置，補登入／備份說明；未登入真實帳號或驗證雙裝置同步。 |
| A1 首訪與回訪完成 | partial | 首訪直接入口、稍後設定、空詞庫引導、歷史重開路徑已接上；沒有瀏覽器完成流程證據。 |
| A2 手機主要目標 ≥44×44 | partial | screen-only min-height/min-width、核對 label 可點範圍與16px操作字級已實作；未取得真實 bounding rect。 |
| A3 找出卷不用穿過新增表單 | done（DOM） | #goToExam 及 #examForm／#examList 都在 #wordForm 和 #batchForm 前，無需展開新增表單；可見座標仍待渲染確認。 |
| A4 保存狀態清楚 | partial | 本機／雲端、預覽／儲存、已核對／可抽題明確分開；連線失敗／衝突與真實已同步畫面未實測。 |
| A5 不破壞測試與列印基準 | partial | 14 檔、原 print CSS、worksheet 子樹／renderer 不變；29 tests、A4／PDF 像素與裁切均未驗。 |
| A6 Windows Chrome 390×844／1280×800 | not done | 沒有 Windows 環境；macOS Chrome 亦無法操作。after 圖、視覺與鍵盤驗收均缺。 |
| 鍵盤：Tab 順序、可見 focus、無陷阱、關閉 overlay | partial | 原生 button/details、邏輯 DOM 順序、screen focus ring、Escape／焦點返回／overlay Tab 邊界已實作；未用實際鍵盤走查。 |
| 記錄 iPhone Safari／實體列印未驗項 | done（記錄） | 下表逐項列明，沒有宣稱已驗證。 |
| 真實前後畫面比較 | partial | 已連結三張 before 及程式差異；after 無法取得。 |
| Draft PR | not done | PR_DRAFT.md 已備妥；受本次不提交／不推送要求，遠端 PR 尚未建立，交 harness。 |
| 清除 skill 資料夾 | not done | 刪除遭 `.agents` 唯讀沙箱拒絕，資料夾仍在；需 harness 清除。未 stage 或 commit skill。 |

## 尚未驗證與複驗條件

- **Windows Chrome**：390×844、1280×800 與 200% zoom 的六頁視覺、長班級名、44px 實際 hitbox、Tab／Shift+Tab／Enter／Space、summary、錯誤恢復、首次／回訪與三種 overlay 的 Escape。沒有任何 Windows PASS。
- **iPhone Safari／實機觸控**：軟鍵盤、貼上、details、單手點選、長頁捲動、返回頁面、Google 回跳與 AirPrint。viewport 模擬也未取得，不能推定實機表現。
- **列印與 PDF**：以原 fixture、相同資料與日期、同 OS／Chrome／字型，對基準與候選產生自訂文字、既有課綱的單／多頁練習紙，以及同一已存考卷的題目／解答／兩者；逐頁 raster 比對、裁切、頁數，另走既有 html2canvas PDF 路徑。未產生任何候選 PDF，不能宣稱 pixel-identical。
- **實體 A4**：練習紙、考卷、解答的紙本字型、注音、格線、四邊與縮放；沒有印表機或紙本證據。
- **真實資料流程**：隔離 profile 重開保存、batch 有效／重複／無效混合、切班未存保護、本機備份預覽／還原、雲端未登入／載入／成功／衝突／失敗、手機與電腦相同家庭。未使用任何私人帳號、未執行上傳或還原。

風險邊界：來源證據未發現列印／資料契約修改；screen CSS 不等於 html2canvas 或跨平台輸出的實測保證。主要剩餘風險是未執行的瀏覽器排版、焦點與完整流程，而非已知的資料或演算法變更。

實作方案重做：**0 次**。沒有切換視覺方向或重構資料邏輯；正常 polish 調整不計為重做。
