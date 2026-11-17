# R3-2 實作量測（box headless Chrome，harness 產出）

基準是 `c36b407`（PR #5 head），實作是 `a1538dd`，兩邊用同一支腳本。腳本和 PR #9 那輪相同：`/workspace/cwp-color/h` 的 layout／color／gates2，加上 `cwp-gavin-palette/preview` 的 shots6 和 probe-extra，另外加了色盲模擬和實際字型探測。

| 檢查 | 基準 c36b407 | R3-2 實作 |
|---|---|---|
| 29 個測試 | 29/29 | 29/29 |
| 考卷 both／questions／answers（種子 fixed-seed-1）列印逐像素 | — | 0 差異（2+1+1 頁） |
| 練習紙列印 3 頁逐像素 | — | 0 差異 |
| 負對照：answers vs questions 第 1 頁 | — | 48,490 個像素不同，比對器有效 |
| 版面 bbox：六頁 9 種狀態 × 390／1280，共 2,772 個元素 | — | 偏移超過 1px 的有 0 個，最大差 0.00px |
| 受保護檔案（exam.css、*.mjs 資料檔、fonts/、stroke-svg/、tests/ 等）、design-exploration/ | — | 未變更 |
| 所有 `@media print` 區塊 | — | 和基準逐字相同 |
| 文字 AA 不及格（390／1280 各 597 筆） | 27 筆，12 種色對 | 2 筆，1 種色對（首頁空預覽裝飾 📋，#ccbec4 疊在白底上，1.8:1，透明度造成） |
| 表單欄位邊界 <3:1（各 40 個） | 40 個 | 0 個 |
| 按鈕邊界 <3:1（參考，非 AA 要求，86 個） | 56 個 | 15 個 |
| 焦點環不及格 | 390：2/145；1280：2/132（`.ob-btn`、`#heroActionBtn`） | 390：1/136；1280：1/139（只剩 `.ob-btn`，outline low 1.00） |
| 色相家族數（30° 一組） | 7 | 3 |
| 六頁共用同一主色的頁數 | 4/6 | 5/6（考卷頁主色為 #7b243f，其他頁為 #54253b） |
| 首頁和詞庫的顏色集合重疊度（Jaccard） | 0.122 | 0.688 |

成功態：標題「練習簿已準備好」是 `--ui-success` #2C684A（綠色），搭配標題文字和 ✅；「下一課」按鈕是淡莓色 #F3D9E2 配 #582137 字；列印按鈕是莓紅 #7B243F。

字型（box 上實際用到的字型；Windows／iPhone 未實測）：
- 首頁 `.hero-title`（第 1 課：拍拍手）：保留原本的 `"Noto Serif TC", serif`，box 實際顯示 Noto Serif TC。Codex 怕換行，沒有改這一個。
- 首頁任務標題和說明、六頁的 h1／h2：改成圓體優先的字型鏈，box 沒有圓體，實際顯示 Noto Sans CJK TC。
- 預期 fallback（NOT MEASURED）：Windows Chrome 通常沒有繁中圓體，標題會用 Microsoft JhengHei（微軟正黑體）。iPhone Safari 通常沒有 Yuanti TC 或 Hiragino Maru Gothic，標題會用 PingFang TC（蘋方）。也就是說，大多數裝置上看到的會是黑體。

色盲模擬（Chrome 內建 deuteranopia／protanopia／tritanopia）的圖在 `cvd-*.png`。莓紅在綠色盲和紅色盲下偏暗褐色，在藍色盲下偏紅，主按鈕和淺色次按鈕在三種模擬下都還分得出來（目視判斷，沒有量化）。

沒有量測的項目（NOT MEASURED）：Windows Chrome、iPhone Safari、實際印表機列印、登入 Supabase 之後的同步狀態。
