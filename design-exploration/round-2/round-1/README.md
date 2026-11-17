# 首頁視覺探索 · Round 01

入口：**[comparison.html](comparison.html)**。可直接以瀏覽器開檔，或在 repo 根目錄執行 `python3 -B scripts/preview.py` 後開啟本機服務的 `/design-exploration/comparison.html`。頁面不使用 CDN、網路字型、圖片或 npm，所有引用皆為相對路徑。

本輪只供 Gavin 看方向，**尚未定案、未實作到產品**。比較頁含現況基準及六個新方向，支援手機 390 與桌面 1280 的預覽模式；每版的「原尺寸查看」可打開完整靜態首頁及頁尾。比較頁縮圖不等於像素驗收截圖。

| 編號 | 方向 | 一句話 |
| --- | --- | --- |
| R0-0 | 現況重建 | 程式碼重建目前灰綠色方案，作為對照。 |
| R1-1 | 晴空藍 | 藍白、厚黑體與輕陰影，清楚俐落的日常工具。 |
| R1-2 | 莓果日常 | 淡粉底、深莓紅與較圓潤字感，親近陪讀情境。 |
| R1-3 | 紫藤留白 | 淡紫、平面色塊與輕字重，安靜而有辨識度。 |
| R1-4 | 墨白編輯 | 黑白、明體課名與細輪廓，沉穩的中文書卷感。 |
| R1-5 | 鉛筆黃 | 亮黃黑字、最厚字重與實線投影，明朗有活力。 |
| R1-6 | 夜讀靛藍 | 深靛底、淡藍按鈕與細字重，夜間備課的深色選項。 |

每版共用同一份內容與版面，不重新安排入口、卡片或留白。以固定的回訪狀態展示；產品按鈕皆無作用。沒有載入產品 JavaScript、列印畫面、字表或資料連線。

## 檔案

- `comparison.html`、`comparison.css`、`comparison.js`：方向總覽、跳轉與尺寸切換。
- `r0-current.html`、`r1-1-blue.html`、`r1-2-berry.html`、`r1-3-violet.html`、`r1-4-ink.html`、`r1-5-yellow.html`、`r1-6-night.html`：七份可獨立開啟的靜態首頁。
- `screen.html`、`screen.css`：共用首頁片段與幾何樣式；避免各版偷偷換版面。
- `themes.css`、`directions.json`：每版候選色彩／字體／表面 token 與理由，尚非定案規格。
- `build.py`：標準函式庫產生器。`python3 -B design-exploration/build.py` 僅重建本資料夾的生成檔，不需要 build 才能瀏覽。
- `contrast.json`：每版 17 組指定文字顏色配對的 sRGB 對比計算；六版最低值均大於 4.5:1。這不是完整無障礙宣告。
- `QUESTIONS.md`：八題與已知答案／假設。
- `SOURCE-NOTES.md`：現況程式依據、token、版面尺寸、技能搜尋採納與不採納理由。
- `VALIDATION.md`：實際命令、檢查結果及未量測事項。
- `verify.py`：唯讀的相對路徑、共用內容、顏色計算與可選 localhost 供檔檢查。
- `shots/README.md`：截圖能力與未量測紀錄；沒有偽造 PNG。

## Gavin 選定後才會做

把選中的首頁視覺變數整理成定案 token，套到原本的螢幕 UI selector，保留首頁結構、尺寸、文案與互動契約。若需要混合版本，新增 R2 並保留 R0／R1；這輪不預先替 Gavin 選定。

實作時會限定螢幕樣式並隔離輸出區。首次設定、已輸出、焦點／hover／disabled 及手機折行須另外在真實瀏覽器驗證；並依 repo 規則以自訂文字與課綱生字檢查 Chrome／iOS Safari 的 A4 列印、PDF、考卷與解答，完成後才能聲稱輸出沒有回歸。本輪不代表已完成這些驗證。

## 技能與界線

使用工作目錄內的 `design-exploration`（步驟 0、1、2、4；版面已接受所以跳過步驟 3，步驟 5／6 待選擇）與 `ui-ux-pro-max`（需求分析、`--design-system`、`--domain style/color/typography`、適用的靜態檢查）。精確命令見 `VALIDATION.md`。

所有產出僅在本資料夾。未修改產品、測試、memory、governance 或 config；未執行 commit、push、branch、checkout、reset、部署、Cloudflare／Supabase CLI。
