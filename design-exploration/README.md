# 首頁探索 · Round 3 短名單

入口：**[comparison.html](comparison.html)**。只保留 **R0-0 現況基準 + R3-1 藍墨粗黑 + R3-2 莓果圓讀**，三欄並排。390／1280 切換的是內嵌頁面寬度，兩種模式均維持三欄；窄螢幕可橫向捲動，也可開啟原尺寸頁。

Gavin 第 3 輪回饋：「**1和2就好 其他去掉**」。依此縮小比較，不新增風格、不要求顏色或 hex；仍為 design-exploration **STEP 5（converge）**，兩個入選方向沒有排名、尚未定案，也未進入產品實作。

## 短名單與父版

| 頁面 | 狀態 | 父版脈絡 | 標題／正文 |
| --- | --- | --- | --- |
| [R0-0 現況重建](r0-current.html) | 比較基準 | 無父版；既有首頁重建 | 課名明體 900、入口系統黑體 700／系統黑體 400 |
| [R3-1 藍墨粗黑](r3-1-bluebold.html) | 入選 | R3-1 ← R2-1 ← R1-1 + R1-4 | 粗黑體 800／系統黑體 400 |
| [R3-2 莓果圓讀](r3-2-berryround.html) | 入選 | R3-2 ← R2-2 ← R1-2 + R1-4 | 圓體 700／圓體優先 400 |

三個獨立頁維持原路徑與原始位元組；字型、文案、色票、字重、共用 `screen.css` 不改。每欄都有完整 font stack 和來源說明。

## 標題與正文 font stack

| 版本 | 角色 | 完整字型鏈 |
| --- | --- | --- |
| R0-0 | 課名標題 | `'Songti TC', 'PMingLiU', 'MingLiU', serif` |
| R0-0 | 入口標題與正文 | `system-ui, -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif` |
| R3-1 | 標題 | `'PingFang TC', 'Microsoft JhengHei', 'Heiti TC', system-ui, sans-serif` |
| R3-1 | 正文 | `system-ui, -apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif` |
| R3-2 | 標題 | `'Yuanti TC', 'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', 'PingFang TC', 'Microsoft JhengHei', sans-serif` |
| R3-2 | 正文 | `'Yuanti TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif` |

**R3-2 的圓體 stack 保持原樣。Windows Chrome 與 iPhone Safari 的標準安裝都不附繁體中文圓體，這兩者很可能退回黑體（Microsoft JhengHei／PingFang TC）。實際 fallback：NOT MEASURED。** 這是本輪要求明示的平台預期，不是裝置字型盤點；另裝字型可能改變結果。Arial Rounded 不能保證繁中文字形為圓體。

全部使用本機字型，不新增 web font、CDN 或外部請求。字重為 CSS 請求值，並非實際選中字面證據。原色票對比數值保留於 [contrast-round3.json](contrast-round3.json)，本輪未重做色彩／無障礙量測。

## 16px 按鈕位移修正

Owner 提供的 headless Chrome harness 診斷：R3-1／R3-2 的 `.task-primary` 在 390px、1280px 比 R0 高 16px，其餘 49 個被比較元素相同；頁面自身 `window.r3Metrics` 因此為 `NEEDS REVIEW`。這是**提供的修正前證據**，不是本輪重新量得。

原因是 `typography-round3.js` 對 `.home-task-entry > div`（h2＋p 的外層）固定了 height／min-height／max-height，阻止最後一個 p 的 1rem 底部 margin 折疊穿過自動高度父元素。修正只讓該外層保留自然高度與原有高度限制，仍固定寬度；子元素的 box／行高與原字距、折行校準照舊，不另外補 16px、不改 margin 或文字。

封存的 R3-3～R3-6 同樣引用此共用 JS，因此也收到修正；詳見 [封存索引](archive/README.md)。修正前 JS 留於 `archive/round-3/typography-round3.js` 供追溯，預覽頁仍引用修正後的共用檔。

**修正後 bbox、換行、溢出與 `r3Metrics`：NOT MEASURED。** 本輪 CUA 開啟頁面回報 `The browser access host is unavailable`，沒有直接啟動 headless Chrome，也未到工作目錄外尋找瀏覽器。不能據靜態檢查宣稱 FITTED／PASS。

[幾何觀察頁](layout-check-round3.html) 現只檢查入選兩版：390×900、1280×900 下，對真正 R0 的 body 與每個後代元素比較 x／y／width／height，要求完全相等（0px 容差），同時檢查原文字節點換行與 `r3Metrics.status === 'FITTED'`。仍須由可用的真實瀏覽器或外部 harness 執行。

## 封存與資料

- **15 個版本移入 [archive/](archive/README.md)**：六個 R1、五個 R2，以及 R3-3～R3-6。沒有刪除版本。
- [Round 1 原比較](archive/round-1/comparison.html)、[Round 2 原比較](archive/round-2/comparison.html) 的完整資料夾整批搬入；81 份檔案保持位元組相同。
- 修改前 [Round 3 的 18 版比較](archive/round-3/comparison.html) 已複製封存，僅重設資源與導覽連結；原 README／VALIDATION／QUESTIONS／來源說明、三份方向資料與幾何觀察程式也有快照。
- 主要封存頁以 `../` 讀原共用 CSS／JS；R3 比較快照以 `../../` 讀共用資源。快照內既有的自足資源保持原位。
- 根目錄的 [directions.json](directions.json)、[round2-directions.json](round2-directions.json)、[round3-directions.json](round3-directions.json) 保留全部 18／5／6 筆，新增 `shortlist_status`（baseline／shortlisted／archived）、`in_comparison`、`page`、回饋與封存原因。`slug` 不變，實際開啟位置以 `page` 為準；`copied_from` 保留原複製來源，`source_page` 指向封存父頁。

## 開啟與驗證

直接開 `comparison.html` 或任一入選頁即可閱讀；直接 file 開檔的實際渲染尚未觀察。幾何觀察請用本機 HTTP，從 repo 根目錄執行：

```sh
python3 -B -m http.server 8765 --bind 127.0.0.1 --directory .
python3 -B design-exploration/verify-shortlist.py --serve-check
```

進入 `http://127.0.0.1:8765/design-exploration/comparison.html`。`verify-shortlist.py` 只讀檔檢查短名單、搬移／保存、資料與連結；`--serve-check` 另核對本機 HTTP，**不是瀏覽器幾何測試**。

舊 `build.py`、`build-round2.py`、`build-round3.py` 與舊 `verify*.py` 保留為歷史工具，依賴搬移前結構；**不要在目前根探索資料夾執行它們來重建或驗證短名單**。目前比較頁為此輪靜態交付物，請用 `verify-shortlist.py`。Round 1／2 完整快照仍保有各自當時的工具。

本輪技能只讀工作目錄內版本：`design-exploration` 用 STEP 5；`ui-ux-pro-max` 以 `text reflow spacing --domain ux` 核對內容自動高度的建議，沒有重新選色或字型。完整證據與缺口見 [VALIDATION.md](VALIDATION.md)，假設見 [QUESTIONS.md](QUESTIONS.md)。

所有寫入都限於 `design-exploration/`，未接觸 `harness-shots/`、產品、memory、PLAN 或字型檔。沒有 commit／push／branch／checkout／reset、遠端歷史查詢或部署。列印／PDF、考卷／解答、練習紙 A4、田字格、描紅、筆順、資料、Auth／同步都未接入此次探索。
