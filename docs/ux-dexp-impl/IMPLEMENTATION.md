# R3-2 莓果圓讀：產品實作紀錄

Owner：Gavin「紅色那個不錯」。產品基準：`c36b4077b1ff8ac0938896f357babc31ff12349a`。採用 **R3-2 ← R2-2 莓紅印記 ← R1-2 + R1-4**。

六頁已連到 `tokens.css`，共用莓紅色票。字型只套在固定寬度、已有明確行高的標題／短段落與文字框；其餘因重排風險保留原字型，完整例外如下。**整體字型替換並非全元素覆蓋；390／1280px 全元素 bbox、列印／PDF 像素相等與實機 fallback 都是 NOT MEASURED。**

## Skills / steps

- 重新讀取工作目錄內 `.agents/skills/design-exploration/SKILL.md`，執行 **STEP 6：定案後實作與驗收紀錄**；未重跑提問、發散或選版。
- `.agents/skills/ui-ux-pro-max/SKILL.md` 只作無障礙參考；兩個 `--domain ux` 查詢為 `text contrast accessible color` 與 `keyboard focus visible`。採用正常文字 4.5:1、焦點可見、顏色須伴隨文字／圖示；未重新選色、未執行 design-system 產生器。
- 已讀本地 R3-2 HTML、方向 JSON、R2 色票、R3 字型、README。原 [比較頁](../../design-exploration/comparison.html)、[R3-2](../../design-exploration/r3-2-berryround.html)、[R0–R3 索引](../../design-exploration/README.md) 與 [封存版本](../../design-exploration/archive/README.md) 全數保留。README 的 STEP 5 狀態是舊探索紀錄；本次定案依 Owner 當前授權，沒有改寫探索文件。

## 變更邊界

- 新增 `tokens.css`：39 個 `--ui-*` 全數在 `@media screen`。六頁各新增一行 link。
- 調整 `styles.css`、`learning.css`、`vocabulary.css`、`stroke-notice.css`、`attribution.css`，以及 `index.html` 的原有樣式；`script.js` 只改 UI 顏色值。
- 原本同時服務 screen／print 的顏色改為 `var(--ui-角色, 原值)`；screen 有新 token，print 沒有 token，fallback 完整保留舊值。只在既有 screen 規則內省略 fallback。所有新增規則都在 `@media screen`。
- 保留既有字級、字重、行高、字距、間距、尺寸、邊線寬度、圓角、DOM、id/class、文字與邏輯。新增／改動的陰影、outline、透明度只影響繪製。disabled fieldset／控制項 opacity 設為 1，以明確文字／底色表達 disabled 並維持對比；重設按鈕及載入動畫原有 0.6 opacity 保留。
- `exam.css` 完全不動。`learning.css` 中 `#examPages { --line: #d5dfd5; }` 僅在 screen 恢復考卷原邊線；沒有把 UI 字型或正文色套在 worksheet 祖先。考卷／答案的字體繼承不變。

## Token table

`R3-2` 來源為 `round3-directions.json` 的 R3-2；字型取頂層 `title_font`／`body_font`，不誤用其繼承的 R2 字型欄位。`derived` 包含沿用既有 R3-2 顏色、但新增語義用途的 token。以下逐項列出全部值；C 編號對應下方完整對比表。

| Token | Role | Value | Source | Computed contrast pairs |
| --- | --- | --- | --- | --- |
| `--ui-bg` | 頁面、次面板底色 | `#F7F3F5` | R3-2 | C01 11.200:1；C05 11.200:1；C07 6.004:1；C10 8.814:1；C13 11.518:1；C27 5.037:1；C32 8.814:1；C40 8.814:1；C46 3.085:1；C48 1.667:1 |
| `--ui-surface` | 卡片、輸入框、Modal、授權徽章 | `#FFFFFF` | R3-2 | C02 12.319:1；C06 12.319:1；C08 6.603:1；C11 9.694:1；C14 12.668:1；C22 7.720:1；C25 6.591:1；C26 5.540:1；C31 9.694:1；C34 7.720:1；C36 10.909:1；C38 7.234:1；C39 9.694:1；C45 3.393:1；C47 1.834:1；C50 4.830:1；C51 6.741:1；C53 3.453:1；C54 3.490:1 |
| `--ui-text` | 正文、導覽、次要標題 | `#54253B` | R3-2 | C01 11.200:1；C02 12.319:1；C03 9.275:1；C04 9.288:1；C51 6.741:1 |
| `--ui-title` | 標題 | `#54253B` | R3-2 | C05 11.200:1；C06 12.319:1 |
| `--ui-muted` | 說明、placeholder、署名與版權 | `#705566` | R3-2 | C07 6.004:1；C08 6.603:1；C09 4.972:1 |
| `--ui-primary` | 主要行動、連結、選中邊線 | `#7B243F` | R3-2 | C10 8.814:1；C11 9.694:1；C12 7.299:1；C16 9.694:1；C31 9.694:1；C32 8.814:1；C33 7.309:1；C52 6.695:1 |
| `--ui-primary-hover` | 主要行動／連結 hover | `#5E1930` | R3-2 | C13 11.518:1；C14 12.668:1；C15 9.538:1；C17 12.668:1 |
| `--ui-on-primary` | 主要按鈕文字 | `#FFFFFF` | R3-2 | C16 9.694:1；C17 12.668:1；C52 6.695:1 |
| `--ui-secondary` | 練習紙與次要按鈕底色 | `#F3D9E2` | R3-2 | C18 9.382:1；C28 4.177:1；C41 7.309:1 |
| `--ui-secondary-hover` | 次要按鈕 hover／今天已輸出 | `#EAC7D5` | R3-2 | C19 8.076:1；C29 3.595:1；C42 6.291:1 |
| `--ui-on-secondary` | 次要按鈕文字 | `#582137` | R3-2 | C18 9.382:1；C19 8.076:1 |
| `--ui-border` | 裝飾分隔線、頁尾與徽章邊線（不作欄位邊界） | `#D3B8C7` | R3-2 | C47 1.834:1；C48 1.667:1；C49 1.381:1 |
| `--ui-card-border` | 首頁卡片、工具頁 panel/result-card 邊線 | `#AD7E94` | R3-2 | C45 3.393:1；C46 3.085:1 |
| `--ui-focus` | 焦點外框、輸入框 focus 邊線／陰影 | `#7B243F` | R3-2 | C39 9.694:1；C40 8.814:1；C41 7.309:1；C42 6.291:1；C43 7.299:1；C44 7.299:1；C53 3.453:1 |
| `--ui-footer-bg` | 頁尾底色 | `#E9DCE3` | R3-2 | C03 9.275:1；C09 4.972:1；C12 7.299:1；C15 9.538:1；C43 7.299:1；C49 1.381:1 |
| `--ui-card-shadow` | 首頁卡片實線投影 | `5px 5px 0 #D7C4CE` | R3-2 | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-button-shadow` | 首頁主要視覺按鈕不加投影 | `none` | R3-2 | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-footer-shadow` | 頁尾卡片不加投影 | `none` | R3-2 | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-font-title` | 局部標題字型鏈；例外見下表 | `'Yuanti TC', 'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', 'PingFang TC', 'Microsoft JhengHei', sans-serif` | R3-2 | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-font-body` | 局部正文／固定尺寸文字框字型鏈；例外見下表 | `'Yuanti TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif` | R3-2 | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-input-border` | 輸入框、選擇按鈕及次要按鈕邊線 | `#8A5A73` | derived | C26 5.540:1；C27 5.037:1；C28 4.177:1；C29 3.595:1；C30 4.171:1 |
| `--ui-disabled-bg` | disabled 欄位／按鈕底色 | `#E9DCE3` | derived | C20 4.972:1；C30 4.171:1；C44 7.299:1 |
| `--ui-disabled-text` | disabled 文字 | `#705566` | derived | C20 4.972:1 |
| `--ui-selection-bg` | 選中文字、選中詞語／年級底色 | `#F3D9E2` | derived | C04 9.288:1；C21 9.382:1；C33 7.309:1 |
| `--ui-selection-text` | 選中文字／選中項目文字 | `#582137` | derived | C21 9.382:1 |
| `--ui-danger` | 刪除按鈕文字及邊線 | `#9B2345` | derived | C22 7.720:1；C34 7.720:1 |
| `--ui-danger-hover` | 刪除 hover 文字及邊線 | `#751732` | derived | C23 9.347:1；C35 9.347:1；C36 10.909:1 |
| `--ui-danger-bg` | 刪除 hover 底色 | `#FBE9EE` | derived | C23 9.347:1；C35 9.347:1 |
| `--ui-warning` | 筆順提醒文字及邊線 | `#7A4D19` | derived | C24 6.499:1；C37 6.499:1；C38 7.234:1 |
| `--ui-warning-bg` | 筆順提醒底色 | `#FFF1DC` | derived | C24 6.499:1；C37 6.499:1 |
| `--ui-success` | 已備妥狀態標題，伴隨原有 ✅ 與文字 | `#2C684A` | derived | C25 6.591:1 |
| `--ui-faded-text` | 保留 0.6 opacity 的載入文字／重新初始化按鈕，以及 0.5 opacity 除錯按鈕焦點 | `#2B0B1B` | derived | C50 4.830:1；C54 3.490:1 |
| `--ui-overlay` | 筆順 Modal 遮罩 | `rgba(84, 37, 59, 0.50)` | derived | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-overlay-strong` | LINE 引導遮罩 | `rgba(84, 37, 59, 0.75)` | derived | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-highlight` | 深莓底上的白色透明強調 | `rgba(255, 255, 255, 0.12)` | derived | C52 6.695:1 |
| `--ui-shadow-soft` | 輕投影顏色 | `rgba(84, 37, 59, 0.08)` | derived | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-shadow` | 一般投影顏色 | `rgba(84, 37, 59, 0.12)` | derived | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-shadow-strong` | Modal 投影顏色 | `rgba(84, 37, 59, 0.20)` | derived | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |
| `--ui-shadow-primary` | 莓紅按鈕投影顏色 | `rgba(123, 36, 63, 0.30)` | derived | N/A（字型或裝飾投影／遮罩；無文字或欄位邊線用途） |

## 對比計算

計算方法：sRGB 通道除以 255；≤ 0.04045 時除以 12.92，否則 `((c + 0.055) / 1.055)^2.4`；亮度權重 0.2126／0.7152／0.0722；比值 `(L亮 + 0.05) / (L暗 + 0.05)`。透明色先在 sRGB 合成。完整機器可讀值見 [contrast.json](contrast.json)。這是宣告值計算，並非瀏覽器像素取樣。

正常與大型文字都以更嚴格的 4.5:1 檢查。本次使用的文字配對最低 4.830:1；表單邊線最低 3.595:1；不透明焦點最低 6.291:1，含保留透明度的按鈕外框最低 3.453:1（針對表列背景）。outline 保留／採用 3px、offset 3px，因此深色按鈕與莓紅外框之間是淺色間隔。裝飾規則／投影不拿來當表單邊界；它們不受 3:1 欄位邊線門檻約束。

| ID | 用途 | 前景 | 背景 | 計算比值 | 門檻 |
| --- | --- | --- | --- | --- | --- |
| C01 | 正文／導覽 | `--ui-text` | `--ui-bg` | 11.200:1 | 4.5:1 PASS |
| C02 | 正文／導覽 | `--ui-text` | `--ui-surface` | 12.319:1 | 4.5:1 PASS |
| C03 | 正文／導覽 | `--ui-text` | `--ui-footer-bg` | 9.275:1 | 4.5:1 PASS |
| C04 | 正文／導覽 | `--ui-text` | `--ui-selection-bg` | 9.288:1 | 4.5:1 PASS |
| C05 | 標題 | `--ui-title` | `--ui-bg` | 11.200:1 | 4.5:1 PASS |
| C06 | 標題 | `--ui-title` | `--ui-surface` | 12.319:1 | 4.5:1 PASS |
| C07 | 說明／placeholder／頁尾 | `--ui-muted` | `--ui-bg` | 6.004:1 | 4.5:1 PASS |
| C08 | 說明／placeholder／頁尾 | `--ui-muted` | `--ui-surface` | 6.603:1 | 4.5:1 PASS |
| C09 | 說明／placeholder／頁尾 | `--ui-muted` | `--ui-footer-bg` | 4.972:1 | 4.5:1 PASS |
| C10 | 連結 | `--ui-primary` | `--ui-bg` | 8.814:1 | 4.5:1 PASS |
| C11 | 連結 | `--ui-primary` | `--ui-surface` | 9.694:1 | 4.5:1 PASS |
| C12 | 連結 | `--ui-primary` | `--ui-footer-bg` | 7.299:1 | 4.5:1 PASS |
| C13 | 連結 hover | `--ui-primary-hover` | `--ui-bg` | 11.518:1 | 4.5:1 PASS |
| C14 | 連結 hover | `--ui-primary-hover` | `--ui-surface` | 12.668:1 | 4.5:1 PASS |
| C15 | 連結 hover | `--ui-primary-hover` | `--ui-footer-bg` | 9.538:1 | 4.5:1 PASS |
| C16 | 主要行動文字 | `--ui-on-primary` | `--ui-primary` | 9.694:1 | 4.5:1 PASS |
| C17 | 主要行動文字 | `--ui-on-primary` | `--ui-primary-hover` | 12.668:1 | 4.5:1 PASS |
| C18 | 次要行動文字 | `--ui-on-secondary` | `--ui-secondary` | 9.382:1 | 4.5:1 PASS |
| C19 | 次要行動文字 | `--ui-on-secondary` | `--ui-secondary-hover` | 8.076:1 | 4.5:1 PASS |
| C20 | disabled 文字 | `--ui-disabled-text` | `--ui-disabled-bg` | 4.972:1 | 4.5:1 PASS |
| C21 | 選中文字／項目 | `--ui-selection-text` | `--ui-selection-bg` | 9.382:1 | 4.5:1 PASS |
| C22 | 刪除文字 | `--ui-danger` | `--ui-surface` | 7.720:1 | 4.5:1 PASS |
| C23 | 刪除 hover 文字 | `--ui-danger-hover` | `--ui-danger-bg` | 9.347:1 | 4.5:1 PASS |
| C24 | 提醒文字 | `--ui-warning` | `--ui-warning-bg` | 6.499:1 | 4.5:1 PASS |
| C25 | 成功標題＋✅ | `--ui-success` | `--ui-surface` | 6.591:1 | 4.5:1 PASS |
| C26 | 輸入框／控制邊線 | `--ui-input-border` | `--ui-surface` | 5.540:1 | 3:1 PASS |
| C27 | 輸入框／控制邊線 | `--ui-input-border` | `--ui-bg` | 5.037:1 | 3:1 PASS |
| C28 | 輸入框／控制邊線 | `--ui-input-border` | `--ui-secondary` | 4.177:1 | 3:1 PASS |
| C29 | 輸入框／控制邊線 | `--ui-input-border` | `--ui-secondary-hover` | 3.595:1 | 3:1 PASS |
| C30 | 輸入框／控制邊線 | `--ui-input-border` | `--ui-disabled-bg` | 4.171:1 | 3:1 PASS |
| C31 | 已選控制邊線 | `--ui-primary` | `--ui-surface` | 9.694:1 | 3:1 PASS |
| C32 | 已選控制邊線 | `--ui-primary` | `--ui-bg` | 8.814:1 | 3:1 PASS |
| C33 | 已選控制邊線 | `--ui-primary` | `--ui-selection-bg` | 7.309:1 | 3:1 PASS |
| C34 | 刪除邊線 | `--ui-danger` | `--ui-surface` | 7.720:1 | 3:1 PASS |
| C35 | 刪除 hover 邊線 | `--ui-danger-hover` | `--ui-danger-bg` | 9.347:1 | 3:1 PASS |
| C36 | 刪除 hover 邊線 | `--ui-danger-hover` | `--ui-surface` | 10.909:1 | 3:1 PASS |
| C37 | 提醒邊線 | `--ui-warning` | `--ui-warning-bg` | 6.499:1 | 3:1 PASS |
| C38 | 提醒邊線 | `--ui-warning` | `--ui-surface` | 7.234:1 | 3:1 PASS |
| C39 | 焦點外框／focus 邊線 | `--ui-focus` | `--ui-surface` | 9.694:1 | 3:1 PASS |
| C40 | 焦點外框／focus 邊線 | `--ui-focus` | `--ui-bg` | 8.814:1 | 3:1 PASS |
| C41 | 焦點外框／focus 邊線 | `--ui-focus` | `--ui-secondary` | 7.309:1 | 3:1 PASS |
| C42 | 焦點外框／focus 邊線 | `--ui-focus` | `--ui-secondary-hover` | 6.291:1 | 3:1 PASS |
| C43 | 焦點外框／focus 邊線 | `--ui-focus` | `--ui-footer-bg` | 7.299:1 | 3:1 PASS |
| C44 | 焦點外框／focus 邊線 | `--ui-focus` | `--ui-disabled-bg` | 7.299:1 | 3:1 PASS |
| C45 | 卡片裝飾邊線 | `--ui-card-border` | `--ui-surface` | 3.393:1 | 裝飾；不宣稱 3:1 |
| C46 | 卡片裝飾邊線 | `--ui-card-border` | `--ui-bg` | 3.085:1 | 裝飾；不宣稱 3:1 |
| C47 | 分隔線／頁尾／徽章裝飾邊線 | `--ui-border` | `--ui-surface` | 1.834:1 | 裝飾；不宣稱 3:1 |
| C48 | 分隔線／頁尾／徽章裝飾邊線 | `--ui-border` | `--ui-bg` | 1.667:1 | 裝飾；不宣稱 3:1 |
| C49 | 分隔線／頁尾／徽章裝飾邊線 | `--ui-border` | `--ui-footer-bg` | 1.381:1 | 裝飾；不宣稱 3:1 |
| C50 | 載入 pulse 最低 opacity／重設按鈕 | `--ui-faded-text @ 0.6` | `--ui-surface` | 4.830:1 | 4.5:1 PASS |
| C51 | 成功畫面副標題 | `--ui-text @ 0.8` | `--ui-surface` | 6.741:1 | 4.5:1 PASS |
| C52 | 筆順提示 .95 opacity 文字／.12 高亮底色 | `--ui-on-primary @ .95` | `--ui-highlight over --ui-primary @ .95` | 6.695:1 | 4.5:1 PASS |
| C53 | 重設按鈕的外框（保留 opacity .6） | `--ui-focus @ 0.6` | `--ui-surface` | 3.453:1 | 3:1 PASS |
| C54 | 除錯按鈕的深色外框（保留 opacity .5） | `--ui-faded-text @ 0.5` | `--ui-surface` | 3.490:1 | 3:1 PASS |

綠色僅用在成功標題 `script.js:265`，原有「練習簿已準備好」與前一行 ✅ 保留。其他選取狀態為莓紅；未以顏色單獨新增狀態語意。原有純紅除錯／筆順錯誤訊息屬保護例外，沒有宣稱它們通過文字 AA。原有動畫過渡與瀏覽器原生控制項的實際繪製尚未量測。

## 字型與 geometry 例外

| 角色 | 完整 stack | Windows Chrome 預期 | iPhone Safari 預期 | 量測 |
| --- | --- | --- | --- | --- |
| 標題 | `'Yuanti TC', 'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', 'PingFang TC', 'Microsoft JhengHei', sans-serif` | 有本機圓體時優先；Arial Rounded 只覆蓋部分字元，繁中通常退回 Microsoft JhengHei，再到 sans-serif | 有本機圓體時優先；否則繁中通常退回 PingFang TC，再到 sans-serif | **NOT MEASURED** |
| 正文 | `'Yuanti TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif` | Yuanti 可用才使用，否則 Microsoft JhengHei → system-ui → sans-serif | Yuanti 可用才使用，否則 PingFang TC → system-ui → sans-serif | **NOT MEASURED** |

套用處：

- `styles.css`：`.home-task-entry h2`、`#onboardingTitle`、onboarding 小標題用 title；入口短說明、onboarding 段落、`#heroSubTitle` 與自訂 textarea 用 body。
- `learning.css`：四個 `.tool-page` 的 h1／h2 與 `#examControls h1` 用 title；`.tool-page main > .intro` 與 textarea 用 body。考卷頁只換控制區標題，動態考卷摘要與按鈕保留原字型。

保守例外（未有瀏覽器 bbox 證據，不推定全部字型可以安全替換）：

| 保留範圍 | 原字型宣告／來源 | 原因 |
| --- | --- | --- |
| 首頁 `.hero-title`（含動態課名、成功標題） | `"Noto Serif TC", serif` | 內容會改變且欄寬窄；可能改變換行。未拷貝探索頁的字距／尺寸校準 JS。 |
| 首頁導覽、品牌、按鈕、表單標籤、hint、其餘段落 | 原繼承鏈；`styles.css` 與後載入的 Bootstrap | 自動寬度、flex 及 inline 子元素會受字寬影響；原 body/ancestor font 不改。實際 computed font：NOT MEASURED。 |
| 頁尾及其後代 | `Segoe UI, system-ui, sans-serif` | inline 署名、授權徽章與並排內容可能重排。 |
| 工具頁導覽、button/input/select/label、動態詞語／查詢卡片、說明與通知（上述明確套用者除外） | `Noto Sans TC, Microsoft JhengHei, system-ui, sans-serif` | 自動寬度或動態內容；保留原根字型和 `font: inherit`。 |
| 考卷摘要、導覽與按鈕，以及考卷／答案所有內容 | 原 `learning.css` root stack；Worksheet Kai／Arial 等 `exam.css` 宣告 | 前者動態字寬，後者屬受保護輸出。 |
| `.sheet-page`、練習格、筆順 SVG、`.stroke-modal-example-char` | 原 Kai／edukai 宣告，完全不改 | 輸出與字形不在 UI 改版範圍。 |

以上是保留策略與來源分析，**不是已觀測到某個元素超過 1px 的量測結果**。已套用的短標題／固定文字框仍須用 Owner 的 9 狀態 harness 驗證。沒有新 font 檔、`@font-face` 或外部 URL；首頁原有兩個 Google Fonts stylesheet 與兩個 preconnect 留著，因此不宣稱整個既有網站零字型網路請求。

## Hard-coded literals — changed

下列為本次變更檔案中每個原 literal 的完整位置清單；行號指交付檔案。重複值合併列出。`var(--ui-*, 原值)` 的原值刻意保留為 print fallback，並不是尚未轉換的 screen 色票。只替換顏色的值，原 CSS／HTML／JS 結構不動。

| File:line | 原 literal | Screen token |
| --- | --- | --- |
| `attribution.css:27` | `#495057` | `--ui-text` |
| `attribution.css:31` | `#667eea` | `--ui-primary` |
| `attribution.css:11` | `#6c757d` | `--ui-muted` |
| `attribution.css:37` | `#764ba2` | `--ui-primary-hover` |
| `attribution.css:44` | `#adb5bd` | `--ui-muted` |
| `attribution.css:7` | `#e9ecef` | `--ui-border` |
| `attribution.css:6` | `#f8f9fa` | `--ui-footer-bg` |
| `index.html:369` | `#166534` | `--ui-text` |
| `index.html:418` | `#1e293b` | `--ui-title` |
| `index.html:363` | `#334155` | `--ui-text` |
| `index.html:447` | `#3b82f6` | `--ui-primary-hover` |
| `index.html:337` | `#475569` | `--ui-text` |
| `index.html:435` | `#60a5fa` | `--ui-primary` |
| `index.html:426` | `#64748b` | `--ui-muted` |
| `index.html:356` | `#64748b` | `--ui-text` |
| `index.html:201, 270` | `#666` | `--ui-muted` |
| `index.html:350, 460` | `#94a3b8` | `--ui-muted` |
| `index.html:207` | `#999` | `--ui-muted` |
| `index.html:374` | `#bbf7d0` | `--ui-border` |
| `index.html:358` | `#cbd5e1` | `--ui-border` |
| `index.html:465` | `#cbd5e1` | `--ui-muted` |
| `index.html:336, 379` | `#e2e8f0` | `--ui-border` |
| `index.html:407` | `#eff6ff` | `--ui-surface` |
| `index.html:368` | `#f0fdf4` | `--ui-surface` |
| `index.html:390` | `#f1f5f9` | `--ui-border` |
| `index.html:335` | `#f1f5f9` | `--ui-footer-bg` |
| `index.html:335` | `#f8fafc` | `--ui-footer-bg` |
| `index.html:389` | `rgba(0, 0, 0, 0.03)` | `--ui-shadow-soft` |
| `index.html:389` | `rgba(0, 0, 0, 0.05)` | `--ui-shadow-soft` |
| `index.html:442` | `rgba(59, 130, 246, 0.2)` | `--ui-shadow-primary` |
| `index.html:450` | `rgba(59, 130, 246, 0.3)` | `--ui-shadow-primary` |
| `index.html:437` | `white` | `--ui-on-primary` |
| `index.html:386` | `white` | `--ui-surface` |
| `learning.css:3` | `#24352d` | `--ui-text` |
| `learning.css:101` | `#254a39` | `--ui-primary-hover` |
| `learning.css:103` | `#305b47` | `--ui-focus` |
| `learning.css:7` | `#305b47` | `--ui-primary` |
| `learning.css:4, 87` | `#52645a` | `--ui-muted` |
| `learning.css:40` | `#527d6a` | `--ui-focus` |
| `learning.css:33` | `#a8b7ad` | `--ui-input-border` |
| `learning.css:6` | `#d5dfd5` | `--ui-border` |
| `learning.css:5` | `#f6f8f3` | `--ui-bg` |
| `learning.css:37, 97` | `white` | `--ui-on-primary` |
| `learning.css:24, 33, 36, 112` | `white` | `--ui-surface` |
| `script.js:23` | `#94a3b8` | `--ui-muted` |
| `script.js:294` | `#eee` | `--ui-border` |
| `script.js:281` | `#eee` | `--ui-input-border` |
| `script.js:281` | `white` | `--ui-surface` |
| `stroke-notice.css:128` | `#333` | `--ui-title` |
| `stroke-notice.css:140` | `#444` | `--ui-text` |
| `stroke-notice.css:134, 160` | `#666` | `--ui-muted` |
| `stroke-notice.css:7, 164` | `#667eea` | `--ui-primary` |
| `stroke-notice.css:7, 164` | `#764ba2` | `--ui-primary` |
| `stroke-notice.css:62` | `#856404` | `--ui-warning` |
| `stroke-notice.css:145` | `#f8f9fa` | `--ui-bg` |
| `stroke-notice.css:57` | `#ffc107` | `--ui-warning` |
| `stroke-notice.css:56` | `#fff3cd` | `--ui-warning-bg` |
| `stroke-notice.css:106` | `rgba(0, 0, 0, 0.3)` | `--ui-shadow-strong` |
| `stroke-notice.css:85` | `rgba(0, 0, 0, 0.5)` | `--ui-overlay` |
| `stroke-notice.css:12` | `rgba(102, 126, 234, 0.3)` | `--ui-shadow-primary` |
| `stroke-notice.css:178` | `rgba(102, 126, 234, 0.4)` | `--ui-shadow-primary` |
| `stroke-notice.css:48` | `rgba(255, 255, 255, 0.2)` | `--ui-highlight` |
| `stroke-notice.css:8, 165` | `white` | `--ui-on-primary` |
| `stroke-notice.css:101` | `white` | `--ui-surface` |
| `styles.css:116` | `#0284c7` | `--ui-secondary-hover` |
| `styles.css:114` | `#0ea5e9` | `--ui-secondary` |
| `styles.css:44, 176, 1422` | `#1e293b` | `--ui-title` |
| `styles.css:1970, 1992` | `#24352d` | `--ui-text` |
| `styles.css:1985` | `#254a39` | `--ui-primary-hover` |
| `styles.css:999` | `#2C3E50` | `--ui-text` |
| `styles.css:2001` | `#305b47` | `--ui-focus` |
| `styles.css:1978, 1994` | `#305b47` | `--ui-primary` |
| `styles.css:1961` | `#305b47` | `--ui-text` |
| `styles.css:108` | `#334155` | `--ui-text` |
| `styles.css:119` | `#3b82f6` | `--ui-focus` |
| `styles.css:113` | `#4338ca` | `--ui-primary-hover` |
| `styles.css:1454` | `#475569` | `--ui-text` |
| `styles.css:89, 90, 94, 95, 111` | `#4f46e5` | `--ui-primary` |
| `styles.css:1995` | `#52645a` | `--ui-disabled-bg` |
| `styles.css:1971, 1989` | `#52645a` | `--ui-muted` |
| `styles.css:62, 110, 1466` | `#64748b` | `--ui-muted` |
| `styles.css:996` | `#6C8279` | `--ui-primary-hover` |
| `styles.css:1282` | `#7b8e84` | `--ui-secondary-hover` |
| `styles.css:1097` | `#888` | `--ui-muted` |
| `styles.css:994` | `#8DA399` | `--ui-primary` |
| `styles.css:1265` | `#8fa298` | `--ui-secondary` |
| `styles.css:1056, 1109` | `#999` | `--ui-muted` |
| `styles.css:997` | `#F5F5F0` | `--ui-bg` |
| `styles.css:1290, 1305` | `#a0aec0` | `--ui-muted` |
| `styles.css:298, 889` | `#cbd5e1` | `--ui-disabled-bg` |
| `styles.css:1967, 1990` | `#d5dfd5` | `--ui-border` |
| `styles.css:1995` | `#e2e8e4` | `--ui-disabled-bg` |
| `styles.css:844, 1435` | `#e2e8f0` | `--ui-border` |
| `styles.css:78, 118` | `#e2e8f0` | `--ui-input-border` |
| `styles.css:1162` | `#eee` | `--ui-border` |
| `styles.css:705, 1462` | `#f1f5f9` | `--ui-bg` |
| `styles.css:299` | `#f1f5f9` | `--ui-disabled-text` |
| `styles.css:105, 220, 264, 1427` | `#f8fafc` | `--ui-bg` |
| `styles.css:890` | `#f8fafc` | `--ui-disabled-text` |
| `styles.css:107` | `#ffffff` | `--ui-surface` |
| `styles.css:1240` | `rgba(0, 0, 0, 0.03)` | `--ui-card-border` |
| `styles.css:651, 1234, 1235` | `rgba(0, 0, 0, 0.05)` | `--ui-shadow-soft` |
| `styles.css:168` | `rgba(0, 0, 0, 0.06)` | `--ui-shadow-soft` |
| `styles.css:1000` | `rgba(0, 0, 0, 0.08)` | `--ui-shadow-soft` |
| `styles.css:167, 731, 933, 1382` | `rgba(0, 0, 0, 0.1)` | `--ui-shadow` |
| `styles.css:34` | `rgba(0, 0, 0, 0.12)` | `--ui-shadow` |
| `styles.css:1410` | `rgba(0, 0, 0, 0.2)` | `--ui-shadow` |
| `styles.css:1392` | `rgba(0, 0, 0, 0.75)` | `--ui-overlay-strong` |
| `styles.css:940` | `rgba(14, 165, 233, 0.2)` | `--ui-shadow-primary` |
| `styles.css:287` | `rgba(14, 165, 233, 0.3)` | `--ui-shadow-primary` |
| `styles.css:294` | `rgba(14, 165, 233, 0.4)` | `--ui-shadow-primary` |
| `styles.css:1169` | `rgba(141, 163, 153, 0.1)` | `--ui-selection-bg` |
| `styles.css:1083` | `rgba(141, 163, 153, 0.4)` | `--ui-shadow-primary` |
| `styles.css:1092` | `rgba(141, 163, 153, 0.6)` | `--ui-shadow-primary` |
| `styles.css:1274` | `rgba(143, 162, 152, 0.3)` | `--ui-shadow-primary` |
| `styles.css:1284` | `rgba(143, 162, 152, 0.4)` | `--ui-shadow-primary` |
| `styles.css:644` | `rgba(255, 255, 255, 0.9)` | `--ui-surface` |
| `styles.css:21` | `rgba(255, 255, 255, 1)` | `--ui-surface` |
| `styles.css:806` | `rgba(59, 130, 246, 0.1)` | `--ui-focus` |
| `styles.css:227` | `rgba(59, 130, 246, 0.15)` | `--ui-focus` |
| `styles.css:97, 273` | `rgba(79, 70, 229, 0.3)` | `--ui-shadow-primary` |
| `styles.css:279` | `rgba(79, 70, 229, 0.4)` | `--ui-shadow-primary` |
| `styles.css:96, 270, 1077, 1440, 1979` | `white` | `--ui-on-primary` |
| `styles.css:284, 1267` | `white` | `--ui-on-secondary` |
| `styles.css:31, 79, 226, 685, 729, 805, 863, 931, 937, 1023, 1163, 1231, 1403` | `white` | `--ui-surface` |
| `vocabulary.css:41` | `#254a39` | `--ui-primary-hover` |
| `vocabulary.css:28` | `#823932` | `--ui-danger` |
| `vocabulary.css:12` | `#a8b7ad` | `--ui-input-border` |
| `vocabulary.css:28` | `#bc8c85` | `--ui-danger` |
| `vocabulary.css:18, 40` | `#edf4ee` | `--ui-selection-bg` |
| `vocabulary.css:2` | `white` | `--ui-surface` |

既有 UI custom property 的值也只做以下替換：

| File:line | 原顏色值 | 新 token（原值保留 fallback） |
| --- | --- | --- |
| `index.html:170` | `var(--primary-sage)` | `--ui-primary` |
| `script.js:265` | `var(--primary-sage)` | `--ui-success` |
| `script.js:275` | `var(--text-dark)` | `--ui-primary` |
| `script.js:281` | `var(--text-dark)` | `--ui-text` |
| `script.js:284` | `var(--primary-sage)` | `--ui-secondary` |
| `script.js:496` | `var(--primary-sage)` | `--ui-secondary` |
| `script.js:496` | `var(--text-dark)` | `--ui-secondary-hover` |

## Hard-coded literals — kept

此清單涵蓋上述變更檔案與唯讀 `exam.css` 的原 literal；資料檔／筆順素材樹完全不改，不擴大掃描或列舉其字表資料。`script.js` 的全部 5 個未改 literal 出現在此表。

| File:line | Literal | 保留原因 |
| --- | --- | --- |
| `backup.html:6` | `#f6f8f3` | 既有 theme-color metadata；CSS var() 無法用於此 content，保持原 DOM 屬性 |
| `exam.css:13` | `#151915` | 考卷／答案／A4 輸出，整檔受保護 |
| `exam.css:30` | `#272d27` | 考卷／答案／A4 輸出，整檔受保護 |
| `exam.css:49` | `#4e574d` | 考卷／答案／A4 輸出，整檔受保護 |
| `exam.css:35, 36` | `#858a84` | 考卷／答案／A4 輸出，整檔受保護 |
| `exam.css:53` | `#a4a9a2` | 考卷／答案／A4 輸出，整檔受保護 |
| `exam.css:13, 62` | `white` | 考卷／答案／A4 輸出，整檔受保護 |
| `exam.html:6` | `#f6f8f3` | 既有 theme-color metadata；CSS var() 無法用於此 content，保持原 DOM 屬性 |
| `index.html:379` | `transparent` | 原全媒體透明值；年級控制邊線僅於 screen 另用 --ui-input-border 覆寫，其餘保留 |
| `learning.css:44` | `#902f29` | 原錯誤訊息紅色，依 Owner 要求保留 |
| `script.js:975` | `#000000` | 筆順渲染輸出／等待或無資料狀態；含 SVG fill |
| `script.js:943` | `#999` | 筆順渲染輸出／等待或無資料狀態；含 SVG fill |
| `script.js:959` | `#ccc` | 筆順渲染輸出／等待或無資料狀態；含 SVG fill |
| `script.js:310, 993` | `red` | 原除錯／錯誤紅色；不改判斷與訊息 |
| `styles.css:124, 1589` | `#000` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:122, 1596, 1597, 1616, 1617, 1623, 1629, 1635, 1641, 1869, 1883, 1891, 1900, 1910, 1936, 1945` | `#3B4CCA` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:1924` | `#999` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:123` | `#FF00FF` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:630` | `#ccc` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:1709` | `blue` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:1705` | `red` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:333` | `rgba(0, 0, 0, 0.04)` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:332` | `rgba(0, 0, 0, 0.1)` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `styles.css:715, 918, 963, 1110, 1189, 1351, 1553, 1669` | `transparent` | 原全媒體透明值；年級控制邊線僅於 screen 另用 --ui-input-border 覆寫，其餘保留 |
| `styles.css:322, 1504, 1527, 1583, 1806, 1842, 1858` | `white` | 練習紙、描紅、田字格、print／print debug 或輸出投影 |
| `sync.html:6` | `#f6f8f3` | 既有 theme-color metadata；CSS var() 無法用於此 content，保持原 DOM 屬性 |
| `vocabulary.css:31` | `#902f29` | 原錯誤訊息紅色，依 Owner 要求保留 |
| `vocabulary.html:6` | `#f6f8f3` | 既有 theme-color metadata；CSS var() 無法用於此 content，保持原 DOM 屬性 |

`learning.css:178` 的 `#examPages` 新增保護性 literal `#d5dfd5`，與 `exam.css` 原 `var(--line)` 在基準的值一致；它只保護 screen 的考卷邊線，不是 UI token。未改 error 紅 `#902f29` 對白／頁底亦有足夠對比；純 `red` 對白僅 3.998:1，依明確保留要求不修改。

## 驗證結果與未量測項目

詳見 [checks.json](checks.json)。

| 檢查 | 結果 | 證據／限制 |
| --- | --- | --- |
| 產品初始內容與指定 base | PASS | 本次 12 個既有產品檔案逐一比對指定 commit 的內容一致；未查其他分支／遠端歷史。探索資料為既有後續成果。 |
| 既有 print 區塊 | PASS（原始碼） | 實際 9 個：styles.css 6、index.html 1、stroke-notice.css 1、attribution.css 1，逐 byte 相同。 |
| All-media CSS fallback | PASS（原始碼） | 將新 UI var 視為 undefined 後，既有 all-media 宣告完整還原；新增規則全為 screen。 |
| HTML DOM／文案與 JS 邏輯 | PASS（原始碼） | 六頁移除唯一新 link、還原顏色 fallback 後與基準逐 byte 一致；script.js 還原顏色值後也逐 byte 一致。不是僅靠忽略空白的比較。 |
| 尺寸／排版宣告 | PASS（原始碼） | 原宣告不動；新增宣告僅 paint／font、focus、opacity 與考卷原邊線隔離；不能替代 bbox 驗證。 |
| 六頁與所有變更樣式／script（13 個產品檔案）本機 HTTP | PASS | 各 200，回應位元組與本機檔一致；未部署。 |
| Token 對比 | PASS（計算） | 所有非裝飾 C pair 達門檻；不宣稱瀏覽器整頁 accessibility audit 通過。 |
| 29 個 Node tests | **NOT RUN** | `node --test tests/*.test.mjs` exit 127：`zsh: command not found: node`。29 是 Owner 提供的預期數，未宣稱通過。 |
| 六頁／9 狀態 × 390、1280px bbox | **NOT MEASURED** | CUA：`The browser access host is unavailable`；PATH 無瀏覽器命令，Python Playwright／Selenium 不可用。沒有到工作目錄外找瀏覽器。 |
| 自訂文字＋課綱生字各一份練習紙 | **NOT MEASURED** | 生成、Chrome／iOS Safari 預覽、裁切均須可用瀏覽器；沒有拿 source 檢查冒充 runtime 輸出。 |
| 練習紙、筆順 SVG、考卷／解答與 A4 PDF 像素 | **NOT MEASURED** | 保護原始碼與 print fallback 已核對；原生列印與 html2canvas PDF 截圖比對未執行。 |
| Windows Chrome／iPhone Safari 字型與 focus 可見性 | **NOT MEASURED** | 字型表只是來源中的預期 fallback；未盤點實機字型、Tab 焦點或裁切。 |
| Git diff 空白檢查 | PASS | `git diff --check` 無錯。無 commit／push／branch／checkout／reset。 |

剩餘驗證風險：字寬／原生控件或外部 Bootstrap cascade 仍可能產生未觀察到的差異。補驗條件：可用 Chrome 上執行 Owner 的基準 harness，若有 >1px 的字型差異，將該元素恢復本表原字型，不改尺寸來補償；再於 Windows Chrome／iPhone Safari 實測列印與 A4 PDF。現階段不宣稱整份驗收通過。

## OUT_OF_SCOPE

- 不改 layout、字級、字重、行高、字距、半徑、內容、按鈕文案或資料流程；不搬用探索頁的尺寸校準 JS。
- 首頁既有 Google Fonts／Bootstrap／其他 CDN 依賴保持原樣；移除它們會超過「只增一行 link、保留 DOM／輸出」邊界，且可能改變基準字型。無新增網路字型來源或請求。
- 初始 CSS 裡既有 `.sheet-page` 文字編碼／font 字串問題不修；它屬輸出樣式且變更可能影響 PDF。
- 既有純紅 debug／筆順錯誤、小字、低對比筆順等待／無資料字色、UA 原生 checkbox／file input 及既有淡入動畫保留；沒有以本次 token 計算聲稱整站 WCAG 認證。
- 不改 browser theme-color metadata、不改資料顏色、字形與原署名、授權、儲存、Auth、同步、資料管線、測試、腳本工具、memory、治理、PLAN 或探索檔。
- 不做部署、提交、推送、分支操作、工作目錄外檔案讀取或治理更新。
