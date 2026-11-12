# UX 任務 2：驗證紀錄

日期：2026-11-12。平台：macOS。起點 `02349bd`，網站程式與 `901cb8d` 的相關檔案沒有差異。所有檢查只在本工作目錄執行；沒有 build step、安裝、部署、commit 或 push。

## 實際執行

| 檢查 | 方法及結果 | 能支持的結論 |
| --- | --- | --- |
| 既有 29 項測試 | `node --test tests/*.test.mjs`：exit 127，`zsh:1: command not found: node`。`command -v node` 無結果。**NOT RUN**。 | 本機 shell 沒有 Node CLI；不能宣稱任何一項既有測試通過。沒有修改 tests。 |
| JS 語法 | 使用既有 JS 工具的 `node:vm`，`.js` 交給 `new vm.Script(source)`，`.mjs` 交給 `new vm.SourceTextModule(source)`；四個修改檔皆成功解析。 | 僅 `script.js`、`stroke-notice.js`、`vocabulary.mjs`、`learning.mjs` 的語法有效。這是工具提供的解析 runtime，不是 Node CLI 測試，也沒有執行 DOM／資料流程。 |
| 預覽服務 | `python3 -B scripts/preview.py`；Python urllib 對六頁、三份 CSS、四份修改 JS／MJS GET：13/13 HTTP 200，回應與磁碟內容完全一致。 | 可提供靜態資源；不代表瀏覽器執行成功。檢查完成已停止預覽服務。 |
| ID 與表單 | Python `html.parser` 將六頁與 `git show 901cb8d:<file>` 比較。121 個既有 ID 全部保留，無重複；各 form 控制的 id/name/type/required/min/max/maxlength/value/pattern/accept/multiple/autocomplete 相同，無新增巢狀 form。詞庫 26 個 literal `byId` 引用全部存在。 | 保留 JS／harness 的定位與原生表單約束。不能證明互動完成。 |
| DOM 順序 | 直接檢查 `#examForm` 在 `#wordForm`、`#batchForm`、`#wordList` 之前；兩種輸入均使用唯一原 form。 | 找出卷不需經過新增欄位或整份清單；實際首屏可見性仍待量測。 |
| 列印保護 | 三份 CSS 都以原始檔完整內容作為前綴；新增內容逐區塊檢查全在 `@media screen`。`script.js` 從 `function initApp()` 起完整 35,028 字元逐字相同。練習紙預覽 DOM 及祖先保留，設定區只把六個 grade div 換成同 class/data-value 的 button。 | 沒有修改 print 規則、格線、worksheet／exam renderer 或紙面 DOM；**不是 PDF 零像素差證明**。 |
| 受保護檔案 | 與 `901cb8d` 逐位元組比對 33 個檔案，含明禁資料模組、exam.html／exam.mjs／exam.css、所有已追蹤 tests、supabase、fonts、stroke-svg、curriculum 檔及字表（以實際追蹤清單為準）。全部一致。 | 資料契約及演算法來源未改；仍須既有測試驗證執行結果。 |
| 詞庫處理流程 | 比較 9 個完整原始區段：persist、fillBlanks、discardEditor、clearBatch、建班／切班、單筆 input/submit/cancel、批次 input/preview、examSettings、renderExams 至 beforeunload。全部完全一致。批次 commit 僅改成功提示計數名稱。 | 保存、驗證、取消、預覽、生成及 guard 來源保留。不是端對端測試。 |
| HTML 差異與空白 | `git diff --check` 成功；四個工具頁的簡單標籤堆疊檢查無錯誤。index 的既有 2 個堆疊告警與 baseline 相同，未修改不相關的祖先結構。 | 沒有新增該檢查可發現的結構錯誤；沒有宣稱完整 HTML validator 通過。 |
| 修改範圍 | `git diff --name-only` 僅 12 個允許的呈現檔；新增文件限定 `docs/ux-task2/`。既有 `ISSUES.md`、`PLAN.md`、before 圖、`.gitignore` 等不動。 | 實驗範圍檢查通過。 |

精簡原始結果保存在 [CHECK_RESULTS.json](CHECK_RESULTS.json)。驗證產物不納入 `artifacts/` 提交；本次建立的隔離 Chrome profile 已清除。

## 瀏覽器工具結果

- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --version` 可執行，回覆 **157.0.8103.51**。
- headless Chrome 搭配本工作目錄下隔離 profile 及 remote-debugging port：exit **134**，沒有 stderr。
- 再用 `--headless --no-sandbox --disable-gpu --disable-crash-reporter --disable-breakpad --window-size=390,844 --screenshot=…`：同樣 exit **134**，沒有截圖。此測試只針對隔離 profile，未改系統設定。
- 瀏覽器控制：`The browser access host is unavailable`。
- 既有 JS 工具內的 Chrome 子程序：**SIGABRT**，沒有 stderr；Playwright 的既有 runtime import／require 也不可用。沒有安裝依賴或替代瀏覽器。
- 以上不能證明網站有執行錯誤；也不能當作畫面／操作已驗收。沒有新的 after 截圖、touch rectangle、焦點錄影或 PDF。

## 鍵盤實作檢查與仍待實走

- 主要入口為原生 a/button/summary；DOM 與閱讀順序一致，沒有正數 tabindex。
- 有班級時，Tab 可依 DOM 走班級 → 新增班級 summary → 三個任務捷徑 → 出卷欄位／產生 → 歷史 → 單筆／批次 summary → 清單。捷徑展開後 focus 現有課次欄位；編輯開啟單筆後 focus 詞語。
- summary 使用原生 Enter／Space 收合；收合不 reset 原 form。出卷後仍 focus 原歷史連結；dirty／取消確認及 beforeunload 未改。
- 螢幕 CSS 為控制與 checkbox label 設 min-width/min-height 44px，新增藍色 3px focus-visible。**沒有實測 bounding rectangle、縮放後尺寸、遮擋或 Tab 順序**。
- onboarding 有可見關閉按鈕與 Escape；LINE／筆順說明可 Escape，關閉返回先前焦點；對話框的 Tab／Shift+Tab 保持在對話框，關閉可離開。筆順說明隱藏時 inert。**未以真實鍵盤驗證**。

## 必須補驗的缺口

| 缺口 | 原因／風險 | 關閉條件 |
| --- | --- | --- |
| 29 項原測試 | Node CLI 不在環境中；沒有行為回歸結果。 | 在既有 Node 環境執行原命令，取得 29 通過、零失敗完整輸出。 |
| 首次／回訪全流程 | 無法啟動瀏覽器。無班級、0 詞、未核對、有可抽題詞、多班級、編輯取消、重開保留均未實走。 | 用既有合成 fixture 操作建班、單筆、批次預覽／人工核對／存入、重開、出卷、開啟與返回；同 seed 及題數不足均驗。 |
| 失敗與邊界 | 未執行 UI；注音數不符、重複行、挖空越界、只貼詞語、保留錯誤行、離頁 guard 尚無互動證據。 | 使用原 fixture／tests 中的案例驗原錯誤、資料結果與焦點；不能只測成功。 |
| 44×44 與首屏 | 只有 CSS 宣告，沒有 computed layout。 | Windows Chrome 390×844，量所有主要目標 `getBoundingClientRect()`，寬高≥44；回訪詞庫出卷 CTA bottom≤844，無水平溢出及遮擋。 |
| Windows 視覺／鍵盤 | 本機為 macOS 且瀏覽器不可用；沒有 Windows 環境。 | 真正 Windows Chrome 390×844、1280×800 逐頁 Tab／Shift+Tab／Enter／Space／Escape；檢查焦點、展開、錯誤、成功狀態，補同狀態 after 圖。 |
| 雲端呈現／真實跨裝置 | 沒有啟動登入或連接外部帳號；未設定、未登入、loading、成功、衝突／斷線均未實測。 | 以既有授權環境檢查原 adapter 狀態與 inert；所有 header 雲端 href 的 `cloud`、考卷 id/part/book 往返保持；手機存入、電腦重開同家庭。 |
| A4 PDF 像素基準 | 無瀏覽器，沒有生成 PDF。來源保護降低風險但不能證明像素一致。 | 同 Chrome／字型／A4 設定比較 baseline/after 的自訂字、課綱生字單／多頁，及同一考卷的題目／解答／合併模式：頁數相同、零像素差。 |
| iPhone Safari | 沒有真機。 | 真機驗注音、批次貼上、鍵盤遮擋、焦點、返回、下載及列印預覽；不能以 390px Chrome 替代。 |
| 實體列印 | 沒有印表機。 | A4 紙本核對裁切、空白頁、格線、注音、挖空與解答；PDF 不替代紙本。 |

整體結論：**介面實作可供審查，驗收仍為 partial**。所有執行／平台缺口保持未驗證；不宣稱 29 項測試、像素一致、Windows 或 iPhone 驗收通過。
