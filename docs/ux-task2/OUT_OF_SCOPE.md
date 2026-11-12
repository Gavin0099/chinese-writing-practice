# UX 任務 2：變更範圍

日期：2026-11-12。實作基準：網站程式 `901cb8d`；本階段起點 `02349bd`（已含 Phase 1 文件及 before 畫面）。

**超出四項核心任務及驗收要求的變更：none。** 沒有新增功能、依賴、教材、資料格式或部署設定。

## 實際修改的全部 `.mjs`

| 檔案 | 必要理由 | 變更邊界 |
| --- | --- | --- |
| `vocabulary.mjs` | 新增／批次捷徑展開原表單並聚焦；編輯時展開單筆區；首頁出卷深連結在有／無班級時聚焦正確位置；呈現本機來源與空詞庫指引；把 confirmed 計數標為「已核對注音」。 | 只有 DOM 可見性、焦點、頁內導覽和文案。儲存、驗證、預覽、確認、取消、離頁保護、題庫、seed、產生及考卷連結的資料處理保留。 |
| `learning.mjs` | 既有 `openPageStorage()` 成功回傳本機模式後才顯示本機紀錄說明。 | 追加一行 DOM `hidden` 呈現；`recordStorage`、教材讀取及學習紀錄寫入不變。 |

`exam.mjs`、`sync.mjs`、`backup.mjs` 以及所有禁止修改的資料／雲端模組皆未修改。

## 其他程式變更對應

| 檔案 | 對應範圍 |
| --- | --- |
| `index.html`、`styles.css` | U1／U2／U5：首頁詞庫及出卷入口、引導優先順序、工具 disclosure、44px 控制與焦點。原生年級按鈕及引導關閉按鈕屬鍵盤驗收。 |
| `vocabulary.html`、`vocabulary.css` | U2–U7：出卷 DOM 提前、單筆／批次平行 disclosure、空狀態、保存來源、操作尺寸。 |
| `learning.html`、`learning.css` | U2／U5／U6：共用導覽、螢幕互動尺寸、明確的本機／教材說明。考卷頁只受 screen 控制項最小尺寸及焦點樣式影響，紙面不受選取。 |
| `sync.html`、`backup.html` | U6／U8：本機與家庭資料的區別、換裝置步驟、本機替代入口、開發設定適用對象。保留原有顯示條件與事件 ID。 |
| `script.js`、`stroke-notice.js` | 鍵盤驗收：既有引導／LINE 說明／筆順說明加入初始焦點、Tab／Shift+Tab、Escape、關閉後返回焦點；隱藏筆順說明設為 inert。沒有更動渲染、列印、儲存或原提示排程。與 Phase 1 預估檔案的差異見 `DEVIATIONS.md`。 |

未執行外部 skill／設計指南搜尋或讀取、設計 lint、安裝、commit／push／branch／checkout、部署或雲端 CLI。`.gitignore`、治理文件、memory、tests、scripts、教材來源皆未修改。新增交付文件只位於 `docs/ux-task2/`。
