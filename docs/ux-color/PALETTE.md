# 六頁配色提案：墨青與暖紙

本文件是 **Phase 1 配色提案，尚未實作**。基準與本次讀取的 HEAD 均為 `c36b4077b1ff8ac0938896f357babc31ff12349a`。唯一新增的交付檔案是本文件；既有 HTML、CSS、JS、測試、列印與治理文件均不修改。

**一行配色：暖米白 `#F7F5F0` ＋ 白卡片 `#FFFFFF` ＋ 墨青 `#245D59` ＋ 深墨文字 `#243632` ＋ 赭棕焦點 `#8A4B24`。**

## 1. 目前的問題與證據

這是家長與老師選課次、輸入國字、管理詞庫及製作教材的工具。設計目標是讓手機上的文字、操作與狀態容易辨識，並讓進入另一個工具頁時仍有同一個網站的感覺。以下是程式來源與對比計算的證據；不是使用者研究結果，也不是已觀察到的瀏覽器 computed style。

### 實際讀取的樣式來源

| 頁面 | 實際連結的 CSS／額外色彩來源 |
| --- | --- |
| `index.html` | `styles.css`、`stroke-notice.css`、`attribution.css`；既有 Noto Serif TC／Noto Sans TC Google Fonts CSS；最後載入的 Bootstrap **5.3.0**；頁尾內嵌 `<style>`；少數 `style` 屬性及 `script.js` 產生的色彩 |
| `learning.html` | `learning.css` |
| `vocabulary.html` | `learning.css`、`vocabulary.css` |
| `exam.html` | `learning.css`、`exam.css`，包括螢幕預覽與列印規則，**只讀不改** |
| `backup.html` | `learning.css` |
| `sync.html` | `learning.css`、`vocabulary.css` |

六份本機 CSS 均已讀取。另以 HTTP 讀取首頁實際連結的 Bootstrap CSS；兩份 Google Fonts 回應只有 `@font-face`，沒有色彩宣告。`mobile-fix.css`、`card-header-patch.css`、`edukai-patch.css`、`final-header-patch.css`、`preview-header-patch.css` 沒有被這六頁連結，不納入改動清單。

### 現有色彩盤點

下面列出不同來源的十六進位色值；其中包含被後續規則覆蓋的歷史宣告。`white`／`#fff` 統一記為 `#FFFFFF`。透明色與陰影另列，不能把所有搜尋命中都當成目前可見的 UI。

| 來源 | 目前色值與用途 |
| --- | --- |
| `styles.css`：頁面、文字、操作 | `#F8FAFC`、`#FFFFFF`、`#F5F5F0`、`#F1F5F9`；文字 `#1E293B`、`#334155`、`#64748B`、`#2C3E50`、`#475569`、`#24352D`、`#52645A`、`#888`、`#999`、`#A0AEC0`；操作 `#4F46E5`、`#4338CA`、`#0EA5E9`、`#0284C7`、`#8DA399`、`#6C8279`、`#8FA298`、`#7B8E84`、`#305B47`、`#254A39`；焦點 `#3B82F6`；邊框／停用 `#E2E8F0`、`#CBD5E1`、`#EEE`、`#D5DFD5`、`#E2E8E4` |
| `styles.css`：受保護的教材與列印 | `--grid-blue: #3B4CCA`、`--stroke-pink: #FF00FF`、`--text-black: #000`、描紅 `#CCC`、列印輔助 `#999`、除錯 `red`／`blue`。全部保留；不把教材藍／粉紅納入 UI 重配色 |
| `learning.css` | `--ink: #24352D`、`--muted: #52645A`、`--paper: #F6F8F3`、`--line: #D5DFD5`、`--accent: #305B47`；白色面板／按鈕；輸入框 `#A8B7AD`；焦點 `#527D6A`／`#305B47`；錯誤 `#902F29`；hover `#254A39` |
| `vocabulary.css` | 白色 skip link；輸入框 `#A8B7AD`；選取／hover `#EDF4EE`；刪除文字 `#823932`、邊框 `#BC8C85`；錯誤 `#902F29`；主要按鈕 hover `#254A39` |
| `exam.css`，受保護 | 白紙、文字 `#151915`、字格 `#272D27`、十字線 `#858A84`、來源 `#4E574D`、頁尾線 `#A4A9A2`，預覽紙張邊框另引用 `var(--line)`。這個變數引用也必須保持原值 |
| `attribution.css` | 背景 `#F8F9FA`、邊線 `#E9ECEF`、文字 `#6C757D`／`#495057`／`#ADB5BD`、連結 `#667EEA`／`#764BA2`。此檔有連結，但目前首頁頁尾實際使用另一組 `.ui-pro-footer` 樣式 |
| `stroke-notice.css` | 藍紫漸層 `#667EEA → #764BA2`；白字／白 modal；提示背景 `#FFF3CD`、邊線 `#FFC107`、文字 `#856404`；modal 文字 `#333`／`#444`／`#666`、範例底色 `#F8F9FA` |
| `index.html` 內嵌頁尾／style 屬性 | 頁尾漸層 `#F8FAFC → #F1F5F9`、邊線 `#E2E8F0`、正文 `#475569`、小字 `#94A3B8`／`#CBD5E1`、連結 `#64748B`／`#334155`、標題 `#1E293B`、白卡片、圖示底 `#EFF6FF`、徽章 `#F0FDF4`／`#166534`／`#BBF7D0`、回饋按鈕 `#60A5FA`／`#3B82F6`；另外有 `#666`、`#999` 的 inline 文字。HTML 內容不可直接改寫 |
| Bootstrap 5.3.0，外部依賴只讀 | body `#212529`／`#FFFFFF`；link `#0D6EFD`、hover `#0A58CA`；primary `#0D6EFD`、hover `#0B5ED7`；secondary `#6C757D`；border `#DEE2E6`；form focus `#86B7FE`／`rgba(13,110,253,.25)`；muted `rgba(33,37,41,.75)`；light `#F8F9FA` |

透明色盤點：既有透明背景／邊框、白色 navbar 的 `.9` alpha、白色 onboarding 的 `1` alpha、黑色 modal scrim 的 `.5`／`.75` alpha、黑色陰影的 `.03`／`.04`／`.05`／`.06`／`.08`／`.1`／`.12`／`.2`／`.3` alpha。彩色陰影來自 RGB `(79,70,229)`、`(14,165,233)`、`(141,163,153)`、`(143,162,152)`、`(102,126,234)`；input glow 使用 `(59,130,246)` 的 `.1`／`.15` alpha；選取底色是 `rgba(141,163,153,.1)`；筆順提示 highlight 是 `rgba(255,255,255,.2)`。中性陰影、scrim、透明色與所有陰影幾何可原樣保留；彩色陰影才統一色相。

### 為何目前不像同一套介面

1. 首頁早期 tokens 是靛紫／天藍，後段改成淡鼠尾草綠，再由 PR #5 的入口使用 `#305B47` 深綠。首次設定的 `.ob-btn.active` 仍是靛紫；主要練習按鈕是淡綠；筆順 modal 又用藍紫漸層。其他五頁的主要操作則一致使用深綠 `#305B47`。同一種「主要操作」沒有一致的顏色。
2. 首頁宣告 `--bg-beige: #F5F5F0`，但 Bootstrap 在本機 CSS 之後載入，其同等 specificity 的 `body` 規則設定 `--bs-body-bg`，預期會把 body 背景改成白色。其他五頁則直接使用 `#F6F8F3`。只修改首頁最早的 `:root` 色票不足以讓實際畫面收斂。
3. 淡色按鈕搭白字、小字再淡化、邊框接近白底，讓重要資訊的辨識餘裕不足。手機上維持既有字級與版面時，應先提高這些配對的對比；不以縮字、加粗或增加邊框寬度補救。
4. 其他五頁的正文與主要按鈕其實已有良好對比；本提案保留這種深字／淺底關係，調整到一致色相。不是把所有舊顏色都判定為不合格。

### 現況對比計算

全部以 sRGB 相對亮度公式計算；顯示到小數點後兩位，是否過門檻使用未四捨五入的數值。以下「不符」指指定配對，不代表已在瀏覽器確認所有狀態都會顯示。

| 位置／宣告 | 前景或邊界／背景 | 比值 | 判讀 |
| --- | --- | ---: | --- |
| 首頁 `.btn-primary-hero` 最後一組常態色 | `#FFFFFF / #8FA298` | 2.70:1 | 連 3:1 都不足 |
| 同按鈕 hover | `#FFFFFF / #7B8E84` | 3.47:1 | 不足一般文字 4.5:1；不把 600 字重按鈕假定為 large text |
| `#generateBtn` 的 inline `var(--primary-sage)` | `#FFFFFF / #8DA399` | 2.68:1 | 一般文字不符 |
| 新入口 `.task-primary`、其他頁 `button.primary` | `#FFFFFF / #305B47` | 7.74:1 | 已足夠；問題是與其他入口不一致 |
| `.ob-btn.active` | `#FFFFFF / #4F46E5` | 6.29:1 | 已足夠；色相與其他工具頁不一致 |
| `.hero-hint` 最後一組色 | `#A0AEC0 / #FFFFFF` | 2.26:1 | 一般文字不符 |
| 頁尾 `.source-credit`／`.feedback-hint` | `#94A3B8 / #F8FAFC → #F1F5F9` | 2.45 → 2.34:1 | 整段漸層均不足 |
| 頁尾 `.footer-copyright` 的底部配對 | `#CBD5E1 / #F1F5F9` | 1.36:1 | 一般文字不符 |
| `.feedback-btn` 內的 `.btn-text` | `#64748B / #60A5FA` | 1.87:1 | 子元素的 `.btn-text` 規則覆蓋父元素白字；不能只測父元素 |
| 回饋按鈕的白色內容／藍底 | `#FFFFFF / #60A5FA` | 2.54:1 | 即使只改子元素成白色，也不足；底色需一起改 |
| 筆順 modal 的 `.stroke-modal-button` | `#FFFFFF / #667EEA → #764BA2` | 3.66 → 6.37:1 | 漸層較亮一端不足 4.5:1 |
| 其他五頁輸入邊框 | `#A8B7AD / #FFFFFF`；對 `#F6F8F3` | 2.09:1；1.96:1 | 識別輸入區的邊界不足 3:1 |
| 首頁 `.ob-btn` 邊框 | `#E2E8F0 / #FFFFFF` | 1.23:1 | 不能以這條淡線作為可靠的控制邊界 |
| Bootstrap 表單邊框 | `#DEE2E6 / #FFFFFF` | 1.30:1 | 不足 3:1 |
| 詞庫 `.delete` 邊框 | `#BC8C85 / #FFFFFF` | 2.91:1 | 不足 3:1；原文字 `#823932` 則有 8.14:1 |
| 其他工具頁正文／次要文字 | `#24352D / #F6F8F3`；`#52645A / #F6F8F3` | 12.11:1；5.90:1 | 已足夠 |
| PR #5 的既有 outline | `#305B47 / #F6F8F3` | 7.24:1 | 已清楚；保留既有 3px 與 offset，只換顏色 |
| 舊輸入框 glow、Bootstrap glow | 藍色 alpha `.1`／`.15`／`.25` 合成於白底 | 1.12:1／1.19:1／1.41:1 | 不能單靠 glow 宣稱有 3:1 焦點；另有合格 outline 的元件不能因此被誤判為整體失敗 |
| 已連結但非目前頁尾的 attribution 樣式 | `#ADB5BD / #F8F9FA`；`#6C757D / #F8F9FA` | 1.97:1；4.45:1 | 小字配對不足；4.45 不能進位當作 4.5 |
| 提示框 `.stroke-tip` | 字 `#856404 / #FFF3CD`；線 `#FFC107 / #FFF3CD` | 4.96:1；1.47:1 | 字已足夠；有意義的提示邊線若作辨識依據則不足 |

## 2. 提案與 skill 的實際影響

選用偏深的墨青作所有主要操作、選取與連結，暖米白作頁面背景，白色作輸入區與卡片，淡青灰作次要表面。這是面向成人教材工作流程的設計判斷：讓長時間整理詞語的畫面穩定，保留孩子相關工具的親近感，但不增加裝飾色的競爭。不是宣稱某一色相經實驗證明能提高學習效果。

赭棕只用在焦點；提醒用深赭黃＋淺奶油底，錯誤／刪除使用暗磚紅。既有錯誤文字、狀態文案、原生勾選記號、底線與目前頁面標示全部保留。選取的年級、學期與 tab 採墨青底白字的明暗反轉；不新增文字、圖示、ARIA 或 DOM，也不只靠紅／綠區分狀態。

### 實際使用的 skill 查詢與檔案

使用使用者指定的安裝位置 `.agents/skills/ui-ux-pro-max`；來源 pin `nextlevelbuilder/ui-ux-pro-max-skill@6ae86f61f520d6ca229d2f40e070410638c908c5` 是本次輸入提供的版本資訊，沒有另行下載或驗證遠端 commit。

所有查詢都只輸出到終端機，未使用 `--persist`，沒有把 skill 產生的檔案寫進 repo。以下是實際執行的命令（`-B` 避免 Python bytecode 寫入）：

```sh
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "education learning parents" --domain color
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "color-accessible-pairs" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "color-semantic" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "color-not-only" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "foreground background contrast" --domain ux
python3 -B .agents/skills/ui-ux-pro-max/scripts/search.py "semantic color tokens" --domain ux
```

| 讀取／搜尋 | 得到的輸入 | 本提案如何採用或調整 |
| --- | --- | --- |
| `SKILL.md`，Accessibility、Typography & Color、Query Contract、搜尋結果使用原則 | 一般文字 4.5:1、語意 tokens、避免淡灰疊淡灰；輸出是建議 | 以角色命名 tokens，自己驗算實際使用配對；未做 layout／字型／動態設計搜尋或修改 |
| `--domain color` 查詢 | 回傳 LMS、Kids Learning、Language Learning 三組 | 採 LMS 的青綠方向；未採兒童方案的多個高彩度操作色，也未沿用首頁既有靛紫 |
| `data/colors.csv` | 直接讀取；比對第 9 Educational App、43 Online Course/E-learning、78 Language Learning App、152 Kids Learning、179 LMS 列及其 On Primary／Border／Ring 欄位 | LMS `#0D9488` 配黑字是資料原本的配對；對本網站既有白字只有 **3.74:1**，故加深為 `#245D59`（**7.54:1**）。LMS 邊框 `#5EEAD4` 對白只有 **1.48:1**，改為 `#73847C`（**3.95:1**）。不把表格中的 palette 當作整套 AA 保證 |
| `color-accessible-pairs`、`foreground background contrast` UX 查詢 | Color Contrast、Contrast Readability；後者也回傳 Focus Appearance | 增加背景配對矩陣、透明度合成及輸入邊框驗算；不把 AAA 的 focus 面積規則誤稱為本次 AA 要求 |
| `color-semantic`、較窄重試 `semantic color tokens` | 只回傳一般 Color Only／Color Contrast，沒有精確 semantic-token 條目 | 不宣稱找到精確搜尋命中；改用已讀取的 `references/quick-reference.md` §6 `color-semantic` 作直接依據 |
| `color-not-only` UX 查詢；`references/quick-reference.md` §1、§6 | Color Only；`color-accessible-pairs`、`color-not-decorative-only` 等明確條目 | 保留文案／勾選／底線；深色選取用明暗反轉，錯誤紅不取代文字。必要的非色彩改善列到第 6 節，不在這輪做 |

UX 搜尋的來源為 skill 的 `data/ux-guidelines.csv`，使用的是搜尋回傳的條目；未把範例中的示意對比數字當成測量值。

## 3. Tokens 與完整配對契約

以下是預計新增的 **20 個**共用色彩 tokens。表內 T、B、I、A 編號對應後面的完整數值表；這些配對表是 token 表的一部分，不能把色票任意互換後沿用原比值。這輪不新增尺寸、字型、間距、圓角、透明度屬性或陰影幾何 token。

### 共用 tokens：值、用途與替換來源

| Token | 新值 | 角色與允許的使用位置 | 替換的目前色值／selector | 對比配對 |
| --- | --- | --- | --- | --- |
| `--ui-canvas` | `#F7F5F0` | 六頁螢幕底色、次要分區底、頁尾漸層起點 | 首頁 `#F5F5F0`／Bootstrap body 白底、工具頁 `#F6F8F3`、footer 起點 `#F8FAFC` | T1–T7、B1–B4 的 canvas 欄 |
| `--ui-surface` | `#FFFFFF` | 卡片、modal、表單輸入、skip link、空白狀態底 | 既有 `white`／`#FFFFFF`；表單的 `#F8FAFC`。不套到教材紙張 | T1–T7、B1–B4 的 surface 欄 |
| `--ui-surface-muted` | `#EEF2EF` | subpanel／modal 範例、次要按鈕背景、頁尾漸層終點 | `.tab-nav`／`.line-guide-close` 的 `#F1F5F9`；modal 範例／attribution 的 `#F8F9FA`；footer 終點 | T1–T7、B1–B4 的 muted 欄 |
| `--ui-primary-soft` | `#E4EFEC` | 非主要按鈕 hover、有原生勾選記號的選項底、授權徽章與作者圖示底 | `vocabulary.css` 的 `#EDF4EE`；`.license-badge` 的 `#F0FDF4`、`.author-icon` 的 `#EFF6FF` | T1–T7、B1–B4 的 soft 欄 |
| `--ui-text` | `#243632` | 正文、標題、欄位值；成功畫面有 `.8` opacity 的副標題；既有 `var(--text-dark)` 操作色 | `#24352D`／`#334155`／`#2C3E50`／`#1E293B`／Bootstrap `#212529`，modal `#333`／`#444`、attribution strong `#495057` | T1、I4、A2 |
| `--ui-muted` | `#52635D` | 說明、小字、placeholder、頁尾版權與來源說明 | `#52645A`／`#64748B`／`#475569`／`#6C757D`／`#94A3B8`／`#A0AEC0`／`#ADB5BD`／`#CBD5E1` 的 UI 文字、`#888`／`#999`／`#666`；不覆蓋 JS 固定字色 | T2；停用底 5.03:1，另見 A4 |
| `--ui-text-strong` | `#061510` | 只補償既有 `.6` opacity 的 `#resetAppBtn` 與 `.card-loading` pulse 最淡一刻 | 重設按鈕目前 `.text-muted` 的半透明深灰、loading `#999`；不改 opacity 或動畫 | T3、A1 |
| `--ui-primary` | `#245D59` | 主要操作、連結、已教狀態；年級／學期／tab 深色選取背景；checkbox accent | `#305B47`、`#4F46E5`、`#8DA399`、`#8FA298`、`#0EA5E9`、Bootstrap `#0D6EFD`；`.feedback-btn` 的 `#60A5FA`；筆順漸層起點 `#667EEA`；徽章文字 `#166534` | T4、I1、B2 |
| `--ui-primary-hover` | `#1B4946` | 主要操作 hover、連結 hover、既有筆順漸層終點 | `#254A39`／`#4338CA`／`#6C8279`／`#7B8E84`／`#0284C7`／Bootstrap hover 藍；footer hover `#3B82F6`、漸層／attribution hover `#764BA2` | T5、I2、B3 |
| `--ui-primary-active` | `#133A37` | 既有 pressed／active 操作狀態色；不新增狀態行為 | Bootstrap 主要按鈕 active 的 `#0A58CA`／`#0A53BE`，只在既有控制項狀態覆寫 | T6、I3 |
| `--ui-on-primary` | `#FFFFFF` | 主要操作與深色選取文字、筆順漸層白字 | 既有白字；特別覆寫 `.feedback-btn .btn-text` 的灰字與 `.grade-card.active` 的文字色 | I1–I4、A3；不可當淺色背景的字色 |
| `--ui-border` | `#73847C` | 輸入框、未選取年級／學期、可操作選項邊界 | `#A8B7AD`、Bootstrap `#DEE2E6`、`.ob-btn` 的 `#E2E8F0`、`.grade-card` 既有 2px 透明邊框、`.blank-choices label` 的 `var(--line)` | B1；只變 border-color，不變 width/style |
| `--ui-divider` | `#CDD7D1` | 非操作性分隔線、卡片邊線、頁尾裝飾線 | `#D5DFD5`／`#E9ECEF`／`#E2E8F0`／`#EEE`，卡片 `rgba(0,0,0,.03)`、footer 卡片 `#F1F5F9`／徽章 `#BBF7D0`；JS 固定邊框及 exam 紙張除外 | D1，純裝飾，不能挪作輸入框或焦點 |
| `--ui-focus` | `#8A4B24` | 既有 offset outline 的顏色；白底表單既有 focus border／glow 顏色 | `#305B47`／`#527D6A`／`#3B82F6`／`#86B7FE`，以及低 alpha 藍色 focus shadow 的色彩 | B4；外側相鄰表面及 gap 規則見下文 |
| `--ui-danger` | `#963C35` | 錯誤文字、刪除文字與邊框 | `.notice[data-error]`／`.batch-rows [data-error]` 的 `#902F29`；`.word-list .delete` 的 `#823932`／`#BC8C85` | T7、B5 |
| `--ui-warning` | `#795515` | 既有提示框文字與提示邊線 | `.stroke-tip` 的 `#856404`／`#FFC107` | W1：6.06:1，字與邊線均足夠 |
| `--ui-warning-surface` | `#FFF2D6` | 既有提示框背景 | `.stroke-tip` 的 `#FFF3CD` | W1；B1/B4 擴充配對 |
| `--ui-disabled-bg` | `#E1E6E2` | 既有停用操作的背景 | `#obStartBtn:disabled` 的 `#E2E8E4`、非教材 UI 停用背景 `#CBD5E1` | muted 5.03:1／border 3.12:1（未疊 opacity）；A4 說明 |
| `--ui-inverse-highlight` | `rgba(255,255,255,0.08)` | 既有深色筆順提示中的 highlight 背景 | `.stroke-notice-highlight` 的 `rgba(255,255,255,.2)`，維持幾何與 `.stroke-notice-content` opacity | A3：最差 5.77:1 |
| `--ui-primary-rgb` | `36, 93, 89` | 既有彩色裝飾陰影的 RGB 通道 | 前述靛紫／天藍／鼠尾草綠／藍紫的陰影 RGB；各處原 alpha、offset、blur、spread 原樣保留 | 純裝飾，不作字、控制邊界或焦點的對比證據 |

### 文字矩陣

欄位背景依序是 surface `#FFFFFF`、canvas `#F7F5F0`、muted `#EEF2EF`、soft `#E4EFEC`。這裡每一個數字都超過一般文字 4.5:1，因此不需要改字級或借用 large-text 例外。只批准表內的前景／背景角色配對。

| ID／文字 token | surface | canvas | muted | soft |
| --- | ---: | ---: | ---: | ---: |
| T1 `--ui-text` | 12.74:1 | 11.69:1 | 11.27:1 | 10.83:1 |
| T2 `--ui-muted` | 6.36:1 | 5.84:1 | 5.63:1 | 5.41:1 |
| T3 `--ui-text-strong`（未疊 opacity） | 18.71:1 | 17.17:1 | 16.55:1 | 15.91:1 |
| T4 `--ui-primary` | 7.54:1 | 6.92:1 | 6.67:1 | 6.41:1 |
| T5 `--ui-primary-hover` | 10.06:1 | 9.23:1 | 8.90:1 | 8.55:1 |
| T6 `--ui-primary-active` | 12.44:1 | 11.42:1 | 11.01:1 | 10.58:1 |
| T7 `--ui-danger` | 7.01:1 | 6.44:1 | 6.21:1 | 5.96:1 |

| ID／深底文字或語意配對 | 前景／背景 | 比值 |
| --- | --- | ---: |
| I1 | `--ui-on-primary / --ui-primary` | 7.54:1 |
| I2 | `--ui-on-primary / --ui-primary-hover` | 10.06:1 |
| I3 | `--ui-on-primary / --ui-primary-active` | 12.44:1 |
| I4：JS 已使用 `var(--text-dark)` 的列印操作底色 | `--ui-on-primary / --ui-text` | 12.74:1 |
| W1 | `--ui-warning / --ui-warning-surface`，字與提示邊線同色 | 6.06:1 |

### 控制邊界與焦點矩陣

這裡的功能性線條／填色全部超過 3:1；不把 decoration line 當成控制邊框。filled button 的填色本身就是可辨識邊界，不需要加粗或新增 border。

| ID／邊界或焦點 token | surface | canvas | muted | soft |
| --- | ---: | ---: | ---: | ---: |
| B1 `--ui-border` | 3.95:1 | 3.62:1 | 3.49:1 | 3.36:1 |
| B2 `--ui-primary`：主要操作／選取／勾選 | 7.54:1 | 6.92:1 | 6.67:1 | 6.41:1 |
| B3 `--ui-primary-hover` | 10.06:1 | 9.23:1 | 8.90:1 | 8.55:1 |
| B4 `--ui-focus` | 6.75:1 | 6.19:1 | 5.97:1 | 5.74:1 |
| B5 `--ui-danger`：刪除邊界 | 7.01:1 | 6.44:1 | 6.21:1 | 5.96:1 |

補充配對：pressed 填色的邊界使用 T6 同一組比值；白色 checkbox 勾選記號對墨青填色為 **7.54:1**。warning-surface 上 border **3.56:1**、focus **6.08:1**；disabled-bg 上 border **3.12:1**、focus **5.34:1**。錯誤文字與刪除 hover 保持 T7 的合法背景，不以加淡透明度處理。

**焦點的相鄰顏色需要看幾何。** 保留既有 outline 的寬度、style 與 2px／3px offset，赭棕 outline 對照的是中間 gap 與外側的淺色表面；不宣稱赭棕直接貼住墨青時也有 3:1。白底表單的現有 shadow 可只把色值改為不透明 focus 色，保留原 3px／`.25rem` 的幾何。深色 Bootstrap 按鈕若已有外側 outline，緊貼按鈕的 shadow 改用 surface 白色，外圈仍是 offset 赭棕；白／墨青有 7.54:1，赭棕／白有 6.75:1。不得把裝飾性半透明陰影當作焦點通過證據。

對沒有自訂 outline 的頁尾連結，只能重著色實際存在的原生焦點。需在 Chrome／Safari 驗證其可見性；若既有 `outline: none` 或原生輪廓使顏色修改不足以提供清楚焦點，記錄限制，不偷偷新增 outline 寬度、style、offset 或 box-shadow 幾何。

D1 裝飾線 `--ui-divider` 對 surface／canvas／muted／soft 為 **1.48／1.35／1.31／1.25:1**。這些低對比只允許在分隔線、非互動卡片等非必要裝飾；**不稱為 3:1 通過**。互動選項不得沿用 divider，必須用 B1／B2。透明背景也不自行構成一組可用的文字配對，必須看實際下層表面。

### 透明度、漸層與巢狀文字

| ID | 保留的既有條件 | 計算與指派 |
| --- | --- | --- |
| A1 | `#resetAppBtn` 的 inline `opacity: .6`；loading pulse 最淡 `.6` | 使用 `--ui-text-strong`；合成後對 surface／canvas／muted／soft 為 **4.91／4.78／4.72／4.65:1**。只改 color，不能把 opacity 改成 1 |
| A2 | JS 成功畫面 `.hero-subtitle` 的 inline `opacity: .8` | 在此狀態使用 `--ui-text`，合成於白卡片為 **6.78:1**；若仍用 muted 則只有 **4.00:1**，不能照搬一般副標題的 token |
| A3 | `.stroke-notice-content` 的 `.95` opacity 與既有 highlight | 漸層改為 primary → primary-hover，保留方向及 stops。普通白字在較亮端合成後為 **6.99:1**；highlight 白色 alpha 改為 `.08`，連同父層 `.95` 合成，兩端為 **5.77／7.45:1**。兩端各 RGB 通道單調變暗，此組漸層最差值在較亮端 |
| A4 | disabled fieldset `.55`、既有 `.btn:disabled` `.6`／Bootstrap `.65` | 保留 opacity；未疊 opacity 的 muted／disabled-bg 為 **5.03:1**。實際停用元素合成後可能較低，屬 inactive 例外；不能把 5.03 誤報為疊加後數值，也不能把此配對借給可用按鈕 |
| A5 | 頁尾漸層 | canvas → surface-muted，保留原方向及 stops；普通字最低 **11.27:1**、muted 最低 **5.63:1**、primary link 最低 **6.67:1**。`.feedback-btn .btn-text` 必須明確使用 on-primary，不能只改父元素 |

### 既有 custom properties 的橋接表

以下是既有變數的預計新值（alias），不是額外發明一套色票。只在 **screen、且位於控制介面的 selector 範圍**做 alias；教材／列印的 root 原值保留。直接寫死的後段規則仍需用前表的 tokens 覆寫。

| 既有 token | 目前值 | 控制介面內的新值 | 對比用途 |
| --- | --- | --- | --- |
| `--bg-page` | `#F8FAFC` | `var(--ui-canvas)` | T/B canvas 欄 |
| `--bg-card` | `#FFFFFF` | `var(--ui-surface)` | T/B surface 欄 |
| `--text-main` | `#334155` | `var(--ui-text)` | T1 |
| `--text-muted` | `#64748B` | `var(--ui-muted)` | T2；A1/A2 情境直接覆寫 color |
| `--primary` | `#4F46E5` | `var(--ui-primary)` | T4、I1、B2 |
| `--primary-hover` | `#4338CA` | `var(--ui-primary-hover)` | T5、I2、B3 |
| `--secondary` | `#0EA5E9` | `var(--ui-primary)` | T4、I1、B2；既有填色操作一致化 |
| `--secondary-hover` | `#0284C7` | `var(--ui-primary-hover)` | T5、I2、B3 |
| `--border-input` | `#E2E8F0` | `var(--ui-border)` | B1 |
| `--focus-ring` | `#3B82F6` | `var(--ui-focus)` | B4 |
| `--primary-sage` | `#8DA399` | `var(--ui-primary)` | T4、I1、B2；既有 JS 的 `var(...)` 自然解析此值 |
| `--primary-sage-dark` | `#6C8279` | `var(--ui-primary-hover)` | T5、I2、B3 |
| `--bg-beige` | `#F5F5F0` | `var(--ui-canvas)` | T/B canvas 欄 |
| `--text-dark` | `#2C3E50` | `var(--ui-text)` | T1；JS 已引用此變數的深色按鈕為 I4 |
| `--ink` | `#24352D` | `var(--ui-text)` | T1 |
| `--muted` | `#52645A` | `var(--ui-muted)` | T2 |
| `--paper` | `#F6F8F3` | `var(--ui-canvas)` | T/B canvas 欄 |
| `--line` | `#D5DFD5` | `var(--ui-divider)`，僅工具 UI 內 | D1；控制項另用 B1；**exam 紙張繼續讀原值** |
| `--accent` | `#305B47` | `var(--ui-primary)` | T4、I1、B2 |

`--card-shadow` 及所有 worksheet 尺寸／色彩變數原樣保留。Bootstrap 不做全域 `--bs-*` theme 覆寫；針對實際使用的 UI 元件，以同一套 `--ui-*` 值覆寫 color、background-color、border-color、focus／shadow 色彩，避免將框架變數傳入教材祖先或改到非色彩值。

## 4. 後續如何套用到六頁

**本階段以下皆為計畫，未執行。** Phase 2 若開始，新增一份 `tokens.css`，內含 `@media screen` 下的 20 個共用 tokens；六頁各只增加一行 `<link rel="stylesheet" href="tokens.css" media="screen">`，放在最後一個既有 stylesheet link 後。HTML 其餘 bytes 保留，包括 inline styles、頁尾 `<style>`、meta、字型連結與 JS。既有 `theme-color="#f6f8f3"` 先保留，遵守「除了新增一行 link 外不改 HTML」的嚴格邊界。

| 頁面／檔案 | 預計套用範圍與 cascade 處理 |
| --- | --- |
| 首頁 `styles.css` | 追加 `@media screen` 的色彩專用覆寫。body 只改螢幕背景；文字／既有 aliases 限 `.minimal-header`、`.home-task-entry`、`#smartCard`、`#onboardingModal`、`#legacyControls .col-lg-4`、modal 與 footer 的 UI 範圍。Bootstrap 晚載入，必須用適當 specificity 的既有 selector；不只修改最前面的 `:root`。對 `.form-control`、`.form-select`、placeholder、`.text-muted` 的 override 只在控制欄內；`#resetAppBtn` 的 color 需勝過 `.text-muted !important`，仍只改顏色 |
| 首頁 `styles.css` 的頁尾覆寫 | 使用 `#appFooter` 限定，勝過 HTML 末尾的內嵌樣式；改其文字、卡片、既有 gradient 的顏色、badge 與 `.feedback-btn .btn-text`。不能直接改 HTML `<style>`，不能用 background shorthand 意外清掉 gradient 或其他背景屬性 |
| `learning.css` | 追加 screen 色彩覆寫，將 `.tool-page` 的正文、導覽、面板、表單、提示、skip link、按鈕指向共用 tokens。backup 無獨立 CSS，從此取得同一 palette。`--line` 僅在工具 UI scope 中橋接；不要在 screen root 改掉其值 |
| `vocabulary.css` | 追加 screen 色彩覆寫：entry/exam 表單控制項邊框、原生 checkbox accent、checked label 背景、hover、刪除與批次錯誤色。`sync.html` 共用此檔的表單，因此同步收斂 |
| `exam.html` 經 `learning.css` | 只改 canvas 背景、`.page-header`、`#examControls`、`#previewError` 及螢幕狀態提示的顏色。不要把 aliases 放在 `main`、`#examPages` 或其祖先以改變紙張繼承；不要改 exam body 的文字繼承。`.exam-page` 的 `var(--line)` 必須仍為 `#D5DFD5` |
| `stroke-notice.css` | 只在 screen 覆寫 modal 與既有 notice/tip 色彩。藍紫漸層改成墨青兩端，位置、角度、stops 不變；highlight 只改 RGBA 色值，不改 opacity 屬性。中性遮罩及陰影幾何保留 |
| `attribution.css` | 只在 screen 覆寫既有 attribution 色彩角色，保持署名文字與連結。這不代替首頁真正的 `#appFooter` 覆寫 |

預計 UI 檔案清單：新增 `tokens.css`；既有 `styles.css`、`learning.css`、`vocabulary.css`、`stroke-notice.css`、`attribution.css`；六個 HTML 每頁一行 link。Phase 2 另依實際情況建立 `docs/ux-color/OUT_OF_SCOPE.md`；Phase 1 為遵守「恰好一檔」先把待轉錄內容放在第 6 節。

不改 `exam.css`、任何 JS／MJS、資料、字型、stroke-svg、列印 CSS、`.sheet-page`、`.practice-cell`、exam rendering；不改 border width/style、outline width/style/offset、陰影座標、排版、字級、字重、文案、DOM、classes 或 ids。既有字型和外部依賴完全不替換。新增 tokens 與所有消費它們的色彩覆寫都限 screen，避免「只動變數卻改到列印」；原本的 `@media print` 和工作紙規則維持原字節。

## 5. 計算方法與驗證計畫

依 [WCAG 2.2 文字對比說明](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)，一般文字需 4.5:1，大字需 3:1。依 [非文字對比說明](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)，辨識元件／狀態所需的視覺資訊對相鄰顏色需 3:1；純裝飾及 inactive 有例外。本提案的普通 UI 文字全部按 4.5:1 設計。保留文字、勾選等線索的依據為 [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)。這三個官方頁面已於本次讀取。

計算使用 Python 標準函式，直接在終端機執行，沒有新增程式或 dependencies。可用以下程式重現表內不透明配對；透明度先在 sRGB 通道合成，再求亮度，沒有把 alpha 當亮度乘數，也沒有由截圖反推抗鋸齒像素：

```python
def rgb(hex_color):
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]

def luminance(channels):
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
              for c in channels]
    return sum(c * w for c, w in zip(linear, (0.2126, 0.7152, 0.0722)))

def contrast(foreground, background):
    low, high = sorted((luminance(foreground), luminance(background)))
    return (high + 0.05) / (low + 0.05)

def composite(foreground, background, alpha):
    return [alpha * f + (1 - alpha) * b for f, b in zip(foreground, background)]

print(contrast(rgb('#FFFFFF'), rgb('#245D59')))  # 7.5404...
print(contrast(rgb('#73847C'), rgb('#FFFFFF')))  # 3.9470...
```

後續驗證要依序完成，不能把文件計算當作實作驗收：

1. **靜態差異**：與指定 base 比對，HTML 除一行 link 外完全相同；CSS 只准色彩與色彩 tokens。保留 gradient angle/stops、shadow geometry、border/outline width/style、所有非色彩 declarations。不得修改受保護檔案或 `@media print`／worksheet 規則。檢查完整 diff，不只看顏色看起來是否正確。
2. **六頁 390px／1280px**：同一瀏覽器、viewport 高度、DPR、字型載入狀態與資料 fixture，使用實驗 harness 逐一比對每個元素 bounding box 與 base，任何位置／尺寸差異均不通過。截圖及 computed styles 需涵蓋頁面頂部與底部、所有文字、表單、hover、active、disabled、error、keyboard focus；特別讀子元素與 alpha 合成後的配對。新 palette 的可讀性目標在兩個寬度相同。
3. **實際狀態**：首頁首次設定、已設定、展開自訂、產生成功、筆順 modal；learning 空白／查詢結果／錯誤；vocabulary 空班級／有詞語／選字／批次錯誤／刪除；backup 空白與選檔後摘要；sync 未登入／已有可用工作區；exam 無有效 id／有效考卷與解答。保留既有流程，不能為了截圖改 JS 或存取真實雲端資料。
4. **Focus**：鍵盤走完整條可操作路徑，核對 visible outline 的實際相鄰背景、被遮擋情況與原生焦點。保留既有 offset；若特定狀態只能改幾何才能修，依第 6 節回報，不能擴大 color-only 範圍。
5. **列印零差異**：自訂國字與課綱生字各產生練習紙；另產生考卷／解答。相同資料、頁面選項、字型、A4 與列印背景設定下，對 base 與變更版做 PDF 頁數及 raster 像素比較，包含田字格、描紅、筆順、頁尾與裁切。Chrome 及實機 iOS Safari 各自驗證；桌面窄 viewport 不等於 iOS Safari。不得僅因 print CSS 沒改就宣稱像素相同。
6. **既有測試**：有 Node 的環境執行 `node --test tests/*.test.mjs`，核對要求的 29 項均通過，不改測試、不安裝 npm dependencies。沒有 Node 就回報未執行，不能把 HTTP 200 或手算 contrast 當成測試通過。

## 6. 待轉錄到 OUT_OF_SCOPE.md 的項目

Phase 1 不另建第二個檔案。以下是本輪讀到、且不會修改的具體項目；Phase 2 再原樣轉錄並依實際驗證補充。非色彩的版面、字型、間距、DOM 或文案改善：**none proposed / none performed**。

| 位置／限制 | 證據與處置 |
| --- | --- |
| `script.js:23`，LINE guide 說明 | 固定 `#94A3B8` 對白只有 **2.56:1**。按題目要求保留 JS 固定色，不用 CSS `!important` 偷改這段 JS 產物；列為現存 AA 限制 |
| `script.js:281`、`:294`，產生成功畫面 | 固定白底、`#EEE` 邊框／分隔線；`#EEE` 對白 **1.16:1**。前者是「明天再來」按鈕邊框，後者是裝飾 divider。保留 literal；已有 `var(--text-dark)` 與 `var(--primary-sage)` 可隨 UI aliases 解析，不需要改 JS 字串 |
| `script.js:943`、`:959`、`:975` | 筆順 loading `#999`、無資料 `#CCC`、SVG fill `#000000`；涉及工作紙／筆順渲染，全部保留，不能拿 UI muted token 取代 |
| `script.js:295–310`，列印除錯按鈕 | inline `.5` opacity，啟用時寫入 `red`／`inherit` 並改 opacity。白底上即使用黑字，`.5` 合成後最高也只有 **3.98:1**；一般文字無法靠前景色單獨達 4.5。此 JS 狀態與除錯紅色不動，不宣稱整站所有狀態都達 AA |
| focus 幾何或可及性語意 | 若瀏覽器驗證發現某控制項沒有可重著色的可見 outline，或某狀態需要新的文字／圖示／ARIA 才能辨識，另列問題。本輪不新增 outline 幾何或改 DOM／JS |
| 首頁 HTML／print／exam | 原本 inline styles、meta、頁尾的 `text-decoration-color` 保留；新 CSS 只覆寫題目允許的色彩屬性。教材藍／粉紅、exam 紙張灰階與所有列印／渲染色彩不統一到 UI palette |

## 7. 本階段真正觀察到的範圍

- 已確認 HEAD 等於指定 base；讀完六頁連結關係、六份本機 CSS、首頁內嵌樣式與相關 JS 固定色，並取得實際 Bootstrap 5.3.0／字型 CSS。完成上述對比的數值計算及 token／配對設計。
- 文件核對已完成：20 個 tokens 無未定義引用；T/B 矩陣 **48 格**逐格重算與表值一致，且分別達 4.5:1／3:1；4 組 `.6` opacity 補償配對均達 4.5:1。計算器另以黑／白 21:1、同色 1:1、`#777` 對白未達 4.5 與 `#767676` 對白達 4.5 核對。`git diff` 與 staged diff 均無既有檔案變更；排除初始 skill 目錄後，唯一新增檔案為本文件。這些是文件／數值檢查，不是 29 項 Node 測試或 UI 驗收。
- `python3 -B scripts/preview.py` 成功啟動；六個本機 URL 的 HTTP 回應均為 **200**。這只證明檔案可服務，不代表 JavaScript 成功執行或畫面已渲染。
- 瀏覽器存取 host 不可用；native Chrome 存取另回覆 `Computer Use was not approved to use Google Chrome`。因此**未目視六頁，未觀察 390px／1280px 的渲染、computed styles、focus 或 bounding boxes**。已確認 Chrome executable 路徑存在，但未以 headless 模式啟動，沒有宣稱 headless 成功或失敗。
- `node`、`nodejs`、`npm` 均不在 PATH；**29 項 Node 測試未執行**。未觀察 Chrome／iOS Safari 列印、PDF 或實體紙張，也沒有提出它們已通過的主張。
- 使用者要求移除未追蹤 skill；確認其沒有 tracked files 後嘗試刪除指定 skill 目錄，遭工作區 `.agents` 寫入限制拒絕：`PermissionError: [Errno 1] Operation not permitted: 'quick-reference.md'`。清理後檢查仍有原本 **75 個檔案**，skill 目錄仍存在；沒有改 `.gitignore`，也沒有提交它。此清理要求尚未完成，需由具備該路徑寫入權限的一方移除。

配對矩陣是可實作的色彩契約；現存受保護的 JS／教材例外與未完成的瀏覽器驗證，限制了本階段能提出的可及性主張。本階段交付的是單一 palette 文件，不是已套用或已驗收的網站。
