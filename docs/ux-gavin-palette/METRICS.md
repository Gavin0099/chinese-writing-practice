# 門檻與量測（Gavin 配色 vs PR #8）

基準是 `ab/cwp-color-b-1112`（`78a1d2b`）。兩組用同一套腳本、同一台 Linux Chromium（playwright-core），視窗 390×844 與 1280×800。這不是 skill A/B，而是同一套排版換上使用者指定的色票。

| 指標（同一支腳本量測） | PR #8 `78a1d2b` | 本 PR（Gavin 配色） |
|---|---|---|
| 29 個自動測試 | 29 pass／0 fail | 29 pass／0 fail |
| 考卷三種模式（both／questions／answers，固定種子 `fixed-seed-1`）列印 vs PR #8 不同像素 | — | 0／0／0 |
| 練習簿列印（3 頁）vs PR #8 不同像素 | — | 0、0、0 |
| 反向測試：考卷 answers 第 1 頁 vs questions 第 1 頁不同像素 | — | 48,490（腳本抓得到差異） |
| 版面 bbox（9 種頁面狀態 × 390／1280，共 2,772 筆元素）移動 >1px | — | 0 個（最大差 0.00px） |
| 受保護檔案變更 | — | 無 |
| `@media print` 區塊 vs PR #8 | — | 全部相同 |
| 390px 文字 AA 不及格／總文字元素（九個頁面狀態合計） | 2／597 | 2／597 |
| 390px 不及格的前景／背景組合 | `#cbd0ce / #ffffff` 1.56:1，文字「📋」 | `#ccd1d6 / #ffffff` 1.54:1，同一顆裝飾 📋 |
| 390px 表單欄位邊界／底色對比 <3:1（共 40 個） | 0 | 0 |
| 390px 鍵盤焦點環不可見或對比 <3:1 的控制項 | 3（`ob-btn`、`#heroActionBtn`、`grade-card`，皆 outline low 1.00） | 同一組 3 個控制項 |
| 1280px 文字 AA 不及格／總文字元素 | 2／597 | 2／597 |
| 1280px 表單欄位邊界／底色 <3:1 | 0 | 0 |
| 1280px 焦點環不及格的控制項 | 同一組 3 個 | 同一組 3 個 |
| 指定色票對比（token 值重算） | — | 白字／霧藍 6.67:1；次要文字／白 5.91:1；陶土／白 5.37:1；邊線／白 3.73:1 |

練習簿產生時的 `.sheet-page` 數量兩組都是 3。

## 這次有量到的頁尾與成功態

上一輪預覽視窗沒捲到頁尾，也還沒走出「練習簿已準備好」。這次兩種狀態都實際點過、量過 computed style，並有對照圖。

| 元素 | PR #8 | 本 PR |
| --- | --- | --- |
| 頁尾授權徽章文字／背景／邊 | `#245D59`／`#E4EFEC`／`#CDD7D1` | `#315F8C`／`#EDF3FA`／`#D1D6D9`。舊的 `#166534`／`#f0fdf4` 已不在 computed style 裡 |
| 頁尾回饋按鈕 | `#245D59` 底、白字 | `#315F8C` 底、白字 |
| 頁尾說明、版權文字 | `#52635D` | `#566675` |
| 成功態標題「練習簿已準備好」 | `#245D59`（霧青主色） | `#C86D4B`（珊瑚橘）。字級 35.2px，屬 large text，對白底約 3.66:1，過 3:1 |
| 成功態「明天再來」邊框 | 舊 `#eee` | `#D1D6D9`（`--ui-divider`） |
| 成功態「下一課」按鈕 | `#245D59` | `#315F8C` |
| 成功態「列印／儲存為 PDF」 | `#243632` 系深字色 | `#243444` |

成功態的 ✅ 仍是綠色表情符號，並搭配標題文字。

## 方法

- 測試：在 worktree 執行 `node --test tests/*.test.mjs`。
- 版面：每個狀態 `<html>`／`<body>` 與底下每個元素的 bounding box（含捲動位移）；關掉 animation／transition；容許 1px。
- 對比：WCAG 2.x 相對亮度；一般文字 4.5:1（≥24px 或 ≥18.66px 且粗體則 3:1）；表單欄位邊界或填色對鄰近背景 3:1。
- 焦點：真實鍵盤 Tab；outline ≥2px（UA `auto` 算可見），或 box-shadow／邊框／背景變化且對鄰近背景 ≥3:1。
- 列印：`page.pdf`、print media、A4、`pdftoppm -r 100` 後逐像素比對。反向測試用 answers 對 questions。
- 色盲：Chrome CDP `Emulation.setEmulatedVisionDeficiency`，deuteranopia 與 protanopia，390px 首頁回訪與詞庫已載入。

## 還沒收進分數、但與審查有關的觀察

- 焦點環改成珊瑚橘後，首次進入的筆順說明主按鈕一打開就帶著明顯的珊瑚橘環。環對白色 modal 底約 3.66:1；環直接貼著霧藍按鈕只有約 1.83:1，靠既有 3px offset。請審查者判斷這是否太重。
- PR #8 原本就不及格的 `#heroActionBtn`、`.grade-card`、`.ob-btn` 焦點環，本 PR 沒有修好，也沒有變壞。
- 僅有的文字對比失敗仍是 `index.html` 預覽空狀態裡 `opacity: 0.3` 的裝飾 📋。這是既有的透明度，不是配色引入的。合成色由 `#cbd0ce` 變成 `#ccd1d6`，仍約 1.54:1。
- 綠色盲／紅色盲模擬裡，PR #8 的青綠按鈕幾乎變成深灰；本 PR 的霧藍仍清楚是藍。陶土／珊瑚橘會變成偏黃褐，但跟主色還分得出來。

## NOT MEASURED

- Windows Chrome（量測用 Linux Chromium）。
- iPhone Safari。
- 實際印表機列印。
- 真的登入 Supabase 之後的同步成功／失敗狀態。
- Tritanopia（藍色盲）。
- Hover 在真實指標裝置上的每一個過渡中間色。
