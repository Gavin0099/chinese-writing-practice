# 首頁視覺方向探索

先開啟 [comparison.html](comparison.html)。桌面預設並排顯示三個窄版首頁；手機依序排列。選「A／B／C 放大」可看目前整欄寬度，也可另開各案，在自己的手機或桌面寬度檢視。所有資源都在此資料夾內，使用相對路徑，無 CDN、外部字型、圖片或 npm 套件。

| 方向 | 一句話 | 判斷 |
| --- | --- | --- |
| **A 墨藍書房** | 墨藍配清透灰白，清楚、安定的備課工具。 | 首選建議；三案中最冷靜。 |
| **B 陶紅紙箋** | 陶紅配奶油紙白，帶文具與紙張的溫暖感。 | 更有生活感；未來需與錯誤訊息的紅色分開。 |
| **C 霧紫書桌** | 灰紫配淡霧紫白，柔和、親切且有辨識度。 | 品牌個性較突出，耐看程度交由 Gavin 判斷。 |

三案共用首頁結構、字級、間距及固定示例。`home-layout.css` 摘錄目前首頁的螢幕幾何規則，並補足離線所需的 Bootstrap reset／container 規則；`directions.css` 只定義色彩與陰影。這是隔離的靜態複製稿，沒有載入任何產品 JS、列印 CSS、課綱資料模組、字型檔或筆順素材。產品入口皆不執行功能。原有課名與署名文字保留，外部連結改為純文字。

## 檔案

- `comparison.html`、`comparison.css`、`comparison.js`：比較介面、檢視切換、預覽高度調整。
- `ink.html`、`clay.html`、`plum.html`：三個完整首頁靜態預覽，文字和結構一致。
- `home-layout.css`、`directions.css`、`preview.js`：共用版型、三案配色、iframe 高度回報。
- `QUESTIONS.md`：問題與本輪假設。
- `verify.py`：僅用 Python 標準函式庫檢查本資料夾的資源、配色、共用版型與工作區寫入界線。
- `evidence/`：檢查結果、對比計算、開始時的來源檔雜湊，以及 skill 使用紀錄。
- `shots/README.md`：截圖未取得的原因；沒有以概念圖冒充瀏覽器截圖。

## 開啟與檢查

可直接開啟 `comparison.html`，或在 repo 根目錄執行：

```sh
python3 -B scripts/preview.py
# 開啟 http://127.0.0.1:8765/design-exploration/comparison.html
python3 -B design-exploration/verify.py
```

本次 8765 已被占用，實際使用 `python3 -B scripts/preview.py --port 8766`，HTTP 資源回應已檢查。沒有執行會寫到 `artifacts/` 的 fixture 命令。

三案指定的 10 組文字／背景配對皆達 4.5:1；最低 A 4.73:1、B 4.62:1、C 4.64:1。這是 sRGB 色碼計算，不等同完整無障礙驗收。390px／1280px 瀏覽器呈現、互動與截圖 **NOT MEASURED**：瀏覽器工具不可用，本機 Chrome 雖可查版本，但兩次 headless 啟動皆以 134 結束。詳見 [驗證紀錄](evidence/verification.md)。

## 選案後的下一輪

Gavin 選一案後，才將該案色彩對應到首頁螢幕專用的背景、導覽、主／次按鈕、提示、分隔線、卡片與頁尾；維持現有版型及使用流程。下一輪再補齊 hover、focus、disabled 與現有彈窗的同系配色，在桌面 Chrome／實機 iOS Safari 檢查。任何正式 CSS 套用均須與列印及工作紙樣式隔離，另做原有列印回歸；本輪沒有實作或宣稱通過這些驗證。

只使用工作目錄內的 `ui-ux-pro-max` skill。實際步驟、搜尋命令、採用與捨棄的建議列於 [skill 使用紀錄](evidence/skill-usage.md)。
