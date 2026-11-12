# Phase 1：暖紙墨青配色提案

本階段只新增這份文件，**尚未套用配色**。基準與檢查時的 HEAD 均為 `c36b4077b1ff8ac0938896f357babc31ff12349a`；開始時工作目錄乾淨。以下為一套配色，不提供多個方向讓 Owner 再做一次選色。

**配色：暖紙白 `#F7F5EF`、白色卡片 `#FFFFFF`、墨青主色 `#123F37`、深墨文字 `#203832`、赭金焦點 `#AA7934`。**

## 1. 現況、問題與證據

### 讀取範圍與可觀察性

已讀六頁 HTML、`styles.css`、`learning.css`、`vocabulary.css`、`exam.css`、`attribution.css`、`stroke-notice.css`，以及首頁內嵌 footer CSS。也檢查頁面 JS 中的顏色宣告，以辨認不能修改的部分；沒有修改 JS。

首頁依序載入 `styles.css`、`stroke-notice.css`、`attribution.css`、兩份 Google Fonts CSS，最後是現有 Bootstrap 5.3.0 CSS。另五頁載入 `learning.css`；詞庫與同步頁加載 `vocabulary.css`，考卷頁加載 `exam.css`。沒有把未被這六頁連結的 `*-patch.css` 或 `mobile-fix.css` 當成有效規則。

只讀取頁面已連結的外部 CSS，沒有搜尋、安裝或讀取外部 agent skill、配色資料庫、設計指引套件，也沒有執行 design linter。既有依賴的讀取結果：

- `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css`：232,914 bytes，SHA-256 `7f1d37f0d90b6385354c2ac10e2bb91563c46bd7a266ed351222ebcac8496c2a`。
- 現有 Noto Serif TC（400/700/900）與 Noto Sans TC（400/500/700）的 Google Fonts CSS：各有三個字型規則，沒有介面顏色宣告；字型保持原樣。
- `python3 -B scripts/preview.py` 成功提供六頁，逐頁 HTTP 200，回傳內容與本機檔案 bytes 相同。這只證明靜態服務可用。
- 瀏覽器工具回報 `The browser access host is unavailable`。現有 Chrome 以 headless、390 × 844 啟動後退出碼為 `-6`，DOM 輸出為 0 bytes，沒有畫面或 computed style。臨時 profile 已移除，沒有保留截圖或其他產物。
- `node`、`nodejs` 均未在 PATH 找到。**29 項 Node 測試未執行，不能宣稱通過。**

下列「目前配色」是來源碼與 cascade 分析；不是對瀏覽器畫面的假稱觀察。390px、1280px、iOS Safari、鍵盤焦點、A4/PDF 畫素一致性均尚未實測。

### 顏色盤點

| 來源 | 現有顏色與角色 |
| --- | --- |
| `styles.css:103–135` 的第一組 token | 頁面 `#f8fafc`、卡片 `#ffffff`、文字 `#334155`／`#64748b`、主色 `#4f46e5`／hover `#4338ca`、次色 `#0ea5e9`／hover `#0284c7`、輸入框 `#e2e8f0`、焦點 `#3b82f6`。 |
| `styles.css:993–1010` 與後續覆蓋 | 第二組主色 `#8DA399`／`#6C8279`、背景 `#F5F5F0`、文字 `#2C3E50`；最後的 `.btn-primary-hero` 又改成 `#8fa298`／hover `#7b8e84`；`.hero-hint` 為 `#a0aec0`。其他螢幕文字包括 `#1e293b`、`#475569`、`#888`、`#999`；中性底／線包括 `#f1f5f9`、`#cbd5e1`、`#eee`。 |
| `styles.css` 最後的 PR #5 screen 區塊 | 任務入口／onboarding 已另用 `#24352d`、`#52645a`、`#305b47`、hover `#254a39`、分隔線 `#d5dfd5`、disabled 底 `#e2e8e4`。這組深綠沒有取代前面的靛紫與淡鼠尾草按鈕。 |
| `learning.css` | `--ink #24352d`、`--muted #52645a`、`--paper #f6f8f3`、`--line #d5dfd5`、`--accent #305b47`；白色卡片／按鈕／輸入框，輸入框線 `#a8b7ad`、焦點 `#527d6a`（screen 工具頁覆蓋為 `#305b47`）、hover `#254a39`、錯誤 `#902f29`。 |
| `vocabulary.css` | 白底；選取／hover 底 `#edf4ee`、深綠 hover `#254a39`、輸入框線 `#a8b7ad`、刪除文字 `#823932`／邊線 `#bc8c85`、錯誤 `#902f29`；其餘使用 learning tokens。 |
| `attribution.css` | 底 `#f8f9fa`、分隔 `#e9ecef`、文字 `#6c757d`／strong `#495057`／小字 `#adb5bd`；連結 `#667eea`／hover `#764ba2`。有樣式不代表目前有可見實例，需在實作驗證時確認。 |
| `stroke-notice.css` | 紫藍漸層 `#667eea → #764ba2`、白字；提示底 `#fff3cd`／文字 `#856404`／左線 `#ffc107`；modal 白底、文字 `#333`／`#444`／`#666`、範例底 `#f8f9fa`。 |
| `index.html:329–504` 的內嵌 footer CSS | 漸層 `#f8fafc → #f1f5f9`、線 `#e2e8f0`、文字 `#475569`／`#94a3b8`／`#64748b`／`#334155`／`#1e293b`／`#cbd5e1`；badge 底 `#f0fdf4`、字 `#166534`、線 `#bbf7d0`；頭像底 `#eff6ff`；feedback 按鈕 `#60a5fa → #3b82f6` 與父層白字。另有 inline `#666`、`#999`。 |
| 現有 Bootstrap 對本頁相關的顏色 | body `#212529`／白底；primary `#0d6efd`、hover `#0b5ed7`、active `#0a58ca`；邊線 `#dee2e6`、focus 邊線 `#86b7fe`；focus shadow `rgba(13,110,253,.25)`；muted `rgba(33,37,41,.75)`；light `#f8f9fa`；secondary `#6c757d`／`#5c636a`／`#565e64`；狀態 `#198754`／`#dc3545`／`#ffc107`；select SVG 箭頭 `#343a40`。 |
| 透明色／陰影 | `styles.css` 黑色 alpha `.03/.04/.05/.06/.08/.1/.12/.2`、遮罩 `.75`；藍／靛紫／鼠尾草陰影 alpha `.2/.3/.4/.6`；選取綠底 alpha `.1`；白底 alpha `.9/1`、focus 藍 alpha `.1/.15`。stroke notice 有紫色 alpha `.3/.4`、黑影 `.3`、黑遮罩 `.5`、白色 highlight `.2`。footer 有黑影 `.03/.05`、藍影 `.2/.3`；`transparent` 亦用於底與裝飾漸層。 |
| **保護範圍：練習紙與考卷** | `--grid-blue #3B4CCA`、`--stroke-pink #FF00FF`、`--text-black #000`、描字 `#ccc`、紙張白底／既有 SVG 紙紋、print/debug 的 `red`／`blue`／`#999`；`exam.css` 的 `#151915`、`#272d27`、`#858a84`、`#4e574d`、`#a4a9a2`、白底與 `var(--line)`。**全部保留，包括 screen 預覽中的考卷／答案內容。** |

Bootstrap 在本機 CSS 之後載入，因此不能把 `styles.css` 的 beige body 當成已觀察到的最終背景：Bootstrap 的同權重 `body` 規則會設定白底。`.form-control`、`.form-select`、`.btn-primary` 和 `.text-muted` 也需要按真正的優先順序處理，而非只換第一組 `:root`。

### 哪些地方造成問題

家長與老師需要快速區分主要動作、可輸入欄位與輔助說明；手機上的同一工作流程卻會從首頁的靛紫選取、淡綠按鈕切換到工具頁的深綠，再遇到紫色說明視窗與亮藍 footer。這是可由 CSS 指出的視覺不一致。是否造成實際操作時間增加尚未做使用者研究，不把設計判斷寫成實驗事實。

低對比尤其集中在小字、主要按鈕與欄位邊界。以一般文字 **4.5:1**、大字 **3:1**、必要 UI 邊界／焦點 **3:1** 為本輪門檻；沒有用縮放、加粗或變大文字迴避問題。

| 目前 selector／角色 | 前景／背景 | 計算對比 | 判讀 |
| --- | --- | ---: | --- |
| `.btn-primary-hero` 最後有效規則 | `#fff`／`#8fa298` | 2.70:1 | 連大字門檻也未達；hover `#7b8e84` 為 3.47:1，仍未達一般文字門檻。 |
| `#generateBtn` 的 inline token 背景 | `#fff`／`#8DA399` | 2.68:1 | 淡綠無法支撐白字。 |
| `.hero-hint` | `#a0aec0`／白 | 2.26:1 | 0.85rem 小字不足。 |
| `.card-loading` | `#999`／白 | 2.85:1 | 既有 pulse 最淡 opacity .6 時僅 1.78:1。 |
| footer `.source-credit`／`.feedback-hint` | `#94a3b8`／`#f8fafc → #f1f5f9` | 2.45 → 2.34:1 | 補充說明不足。 |
| footer `.footer-copyright` | `#cbd5e1`／`#f1f5f9` | 1.36:1 | 小字不足。 |
| footer `.feedback-btn` 父層白字設定 | 白／`#60a5fa`（hover `#3b82f6`） | 2.54（3.68）:1 | 即使白字成功繼承仍不足。 |
| footer 真正文字子元素 `.feedback-btn .btn-text` | `#64748b`／`#60a5fa`（底色 hover `#3b82f6`） | 1.87（1.29）:1 | 子元素自己的 `.btn-text` 顏色會蓋掉父層白字；需要專門處理。子元素自身 hover 另有規則，未聲稱上述涵蓋所有 hover 組合。 |
| `.ob-btn` 邊界 | `#e2e8f0`／白 | 1.23:1 | 淺灰邊界不足；active 靛紫 `#4f46e5` 的白字則有 6.29:1。 |
| learning／vocabulary 輸入框邊界 | `#a8b7ad`／白；對頁底 `#f6f8f3` | 2.09；1.96:1 | 不足 3:1。 |
| `.blank-choices label` 未選取邊界 | `#d5dfd5`／白 | 1.37:1 | 不能只把同一淡線當互動元件邊界。純分隔線不屬同一判準。 |
| `.word-list .delete` | 字 `#823932`／白；線 `#bc8c85`／白 | 8.14；2.91:1 | 文字合格，但邊線不足。 |
| `.stroke-notice`、`.stroke-modal-button` | 白／`#667eea → #764ba2` | 3.66 → 6.37:1 | 漸層亮端不足；notice highlight 合併 .95 父層 opacity 後約 2.62 → 3.88:1。 |
| attribution 連結／小字 | `#667eea`／`#f8f9fa`；`#adb5bd`／`#f8f9fa` | 3.47；1.97:1 | 一般文字不足；正文 `#6c757d`／`#f8f9fa` 為 4.45:1，也不能四捨五入成合格。 |
| `.stroke-tip` | 字 `#856404`／`#fff3cd`；左線 `#ffc107`／`#fff3cd` | 4.96；1.47:1 | 字已合格；若左線用來辨識提示邊界則不足。 |
| Bootstrap input focus | 線 `#86b7fe`／白；藍色 .25 shadow 合成白底 | 2.06；1.41:1 | 單靠這兩個色層不足；首頁另有 3px 深綠 focus-visible outline 的元件必須合併評估，不能說它們都沒有焦點。 |
| learning 既有正文／輔助字 | `#24352d`／`#f6f8f3`；`#52645a`／`#f6f8f3` | 12.11；5.90:1 | 已合格，保留這種清楚的層級。 |
| learning 既有主按鈕／screen focus | 白／`#305b47`；`#305b47`／`#f6f8f3` | 7.74；7.24:1 | 已合格；本案統一品牌，不把合格的深色系淡化。 |

## 2. 一套配色及理由

採用「暖紙墨青」。暖紙白是閱讀背景，白色維持卡片與輸入區的乾淨感；深墨青讓主要動作和連結跨六頁維持同一個意思。低彩度的背景配合足夠深的文字，讓繁體中文字的細節與輔助說明在手機上仍有餘裕。這是針對使用情境的設計選擇，並不假定所有臺灣家長或老師偏好某種顏色。

赭金只用在焦點標示，不能拿來作小字或白字按鈕底。成功用較清楚的綠、警告用深赭字配淡米黃、錯誤／刪除用暗磚紅；保留既有文字與狀態語意，不讓顏色成為唯一訊息。主色、底色與文字組合在 390px 和 1280px 完全相同，不依 breakpoint 換色，也不改任何版面。

## 3. Token 對照與完整配對限制

新檔案預定為 `tokens.css`。所有新 token 與套用規則只在 **screen** 生效。以下是全部新 token；同值的 surface 與 on-primary 刻意分開，表示不同角色。

背景簡碼：**S** = surface `#FFFFFF`、**P** = page `#F7F5EF`、**Q** = soft `#EEF3F0`、**A** = selected `#E3EEE9`、**W** = warning-bg `#FCF2D9`、**D** = disabled-bg `#E4EAE6`。表內對比索引 T/B/I/E 指向後續矩陣，不代表免驗。

| 新 token | 角色／精確值 | 取代的目前 literal／selector（限螢幕 UI） | 對比與使用限制 |
| --- | --- | --- | --- |
| `--ui-page` | 暖紙頁底 `#F7F5EF` | 首頁 body 的 beige／Bootstrap 白底；工具頁 `--paper #f6f8f3`；footer 漸層起點 | P 欄；不是單靠背景色形成欄位邊界。 |
| `--ui-surface` | 卡片／輸入面 `#FFFFFF` | `.smart-card`、`.onboarding-card`、工具 `.panel/.result-card`、button、select、textarea、modal、footer card 的 white／`#fff` | S 欄；卡片必要邊界使用 B。紙張的白色不動。 |
| `--ui-soft` | 次層面 `#EEF3F0` | `.tab-nav`、UI 表單淺底、`.line-guide-step/.line-guide-close`、modal example、footer 漸層末端／author icon 的 `#f8fafc/#f1f5f9/#f8f9fa/#eff6ff`；次按鈕 hover | Q 欄；只替換已存在的底色，保留漸層角度與 stop 位置。 |
| `--ui-selected` | 已選取淡底 `#E3EEE9` | `.grade-card.active` 的淡綠 alpha 底、`.blank-choices label:has(:checked)` 的 `#edf4ee`、footer badge 的 `#f0fdf4` | A 欄；選取狀態另有 primary 邊界，不能只靠淡底與白底差異。 |
| `--ui-text` | 正文／標題 `#203832` | UI 的 `--text-main #334155`、`--text-dark #2C3E50`、`--ink #24352d`、`#1e293b/#333/#444/#495057/#475569`；scoped Bootstrap body/card 文字 | T；所有一般字級均超過 4.5:1。 |
| `--ui-muted` | 提示／placeholder／次要文字 `#52635D` | UI `--text-muted #64748b`、`--muted #52645a`、`.hero-hint #a0aec0`、footer `#94a3b8/#cbd5e1`、attribution `#6c757d/#adb5bd`、modal `#666`、首頁 inline 空白狀態 `#666/#999` | T；實色，不能再隨意疊 opacity。JS literal 例外見第 6 節。 |
| `--ui-primary` | 主動作／連結／選取邊界 `#123F37` | `#4f46e5/#0ea5e9/#8DA399/#8fa298/#305b47`、Bootstrap blue；`.task-primary/.primary-link/.btn-primary-hero/.ob-btn.active`；notice 漸層第一色、footer feedback 底；連結 `#667eea` | T、I；填色也是按鈕的可見外界線。 |
| `--ui-primary-hover` | 主動作 hover／pressed `#0B302A` | `#4338ca/#0284c7/#6C8279/#7b8e84/#254a39`、Bootstrap hover/active；notice 漸層第二色、footer hover `#3b82f6`、attribution hover `#764ba2` | T、I；保留所有原有 hover transform／transition 數值。 |
| `--ui-on-primary` | 深底文字 `#FFFFFF` | 主按鈕、notice/modal button、step number、active onboarding 的 white；明確套到 `.feedback-btn .btn-text` 子元素 | I；只配 primary／primary-hover／text 三種深底及 notice 的既有 highlight。不能配 focus 或一般淡底。 |
| `--ui-border` | 必要控制／卡片邊界 `#718178` | input `#a8b7ad/#e2e8f0/#dee2e6`；未選取 `.ob-btn/.grade-card/.blank-choices label`；`.panel/.result-card/.smart-card` 的淡線；表單有既有邊線的 native file button | B；只換 border-color，不新增 border 或改寬度／樣式。 |
| `--ui-divider` | 純裝飾分隔 `#D1DCD5` | 非互動區的 `#d5dfd5/#e2e8f0/#e9ecef/#eee`，header 分隔、storage note 分隔、word-list 分隔、footer divider 漸層中點 | E；不可用作輸入框、可選卡片、focus 或文字。 |
| `--ui-focus` | 可見焦點 `#AA7934` | 已有 outline `#527d6a/#305b47`、input focus 邊線 `#3b82f6/#86b7fe`、已有 focus shadow 的藍色／透明藍 | B、I；保留原 outline 寬度／style／offset 與 shadow 幾何，只換顏色。 |
| `--ui-success` | 成功／已教／授權 badge 文字與線 `#286346` | `.teaching-status[data-state='taught']`、badge `#166534/#bbf7d0`；既有成功色使用點 | T；與 A 的文字／線均為 5.96:1。沒有新增狀態或背景元件。 |
| `--ui-warning` | 警告文字／左線 `#80551C` | `.stroke-tip` 的 `#856404/#ffc107` | T、B；W 上 5.83:1。 |
| `--ui-warning-bg` | 警告淡底 `#FCF2D9` | `.stroke-tip #fff3cd` | W 欄；不作文字／必要邊界。 |
| `--ui-danger` | 錯誤／刪除文字與線 `#953F36` | `.notice[data-error]`、`.batch-rows [data-error] #902f29`、`.word-list .delete #823932/#bc8c85` | T、B；刪除仍用淺底、深紅字與線，不新增紅底白字按鈕。 |
| `--ui-disabled-bg` | 停用表面 `#E4EAE6` | onboarding `#e2e8e4`、既有停用 UI `#cbd5e1/#e9ecef` | D 欄；停用字取 muted。既有 disabled opacity 不變，不能把未合成的比值當實際停用對比。 |
| `--ui-opacity-ink` | 既有透明度補償 `#091B16` | `.card-loading #999`；`#resetAppBtn` 的文字與既有 focus 顏色，保留其 inline opacity .6 | T-alpha；只用在白／P／Q 背景。不得用來假稱解決 JS debug 的 .5 opacity。 |
| `--ui-shadow-rgb` | 裝飾陰影 RGB `18, 63, 55` | UI 陰影的黑、靛紫、sky、sage、footer blue、notice purple RGB | `rgba(var(--ui-shadow-rgb), 原 alpha)`；E。只換色，保留每個影子的 offset／blur／spread／inset／層數。不作可見邊界的證據。 |
| `--ui-scrim` | modal 遮罩 `rgba(18,63,55,0.50)` | `.stroke-modal-overlay rgba(0,0,0,.5)` | E；不可把文字放在此透明層上，modal 內容仍在 S。 |
| `--ui-scrim-strong` | LINE guide 遮罩 `rgba(18,63,55,0.75)` | `.line-guide-overlay rgba(0,0,0,.75)` | E；同上，不改 overlay opacity 或 backdrop-filter。 |
| `--ui-highlight` | notice 內 highlight `rgba(255,255,255,0.20)` | `.stroke-notice-highlight` 原色不變，納入 token | I-alpha；保留父 `.stroke-notice-content` 的 .95 opacity。 |

保留 `transparent`、已存在的白色透明表面與不在活躍 UI 套用清單中的舊樣式；不為消除每個 literal 而整理整份 CSS。特別是紙張、描字、筆順與 JS literal 不屬本次替換。

### T：所有允許的一般文字／淺背景配對

下表是可使用組合的完整矩陣；不是宣稱每個組合目前都出現在 DOM。實作只使用這個矩陣內的文字／淺背景配對。**每格均 ≥ 4.5:1**，所以大字也合格。

| 前景 token | S | P | Q | A | W | D（無群組 opacity） |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `--ui-text` | 12.55 | 11.51 | 11.18 | 10.56 | 11.26 | 10.29 |
| `--ui-muted` | 6.36 | 5.83 | 5.67 | 5.35 | 5.71 | 5.21 |
| `--ui-primary` | 11.72 | 10.75 | 10.44 | 9.86 | 10.52 | 9.60 |
| `--ui-primary-hover` | 14.28 | 13.10 | 12.73 | 12.02 | 12.81 | 11.70 |
| `--ui-success` | 7.09 | 6.50 | 6.32 | 5.96 | 6.36 | 5.81 |
| `--ui-warning` | 6.49 | 5.96 | 5.79 | 5.46 | 5.83 | 5.32 |
| `--ui-danger` | 6.90 | 6.33 | 6.15 | 5.81 | 6.19 | 5.66 |

T-alpha：`--ui-opacity-ink` 在 S/P/Q 上未透明時為 **17.80/16.32/15.86:1**；opacity .6 後為 **4.69/4.56/4.51:1**。適用於 `.card-loading` pulse 的最淡時刻及 `#resetAppBtn`；該按鈕的焦點也要使用同一深色補償，不能使用在 .6 opacity 下不足 3:1 的赭金。不可把這個 token 的 .6 用法搬到 A 等較深的背景。

### B：必要 UI 邊界／焦點配對

| 邊線／焦點 token | S | P | Q | A | W | D |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `--ui-border` | 4.11 | 3.77 | 3.66 | 3.46 | 3.68 | 3.37 |
| `--ui-focus` | 3.82 | 3.51 | 3.41 | 3.22 | 3.43 | 3.13 |
| primary 選取線／填色邊界 | 11.72 | 10.75 | 10.44 | 9.86 | 10.52 | 9.60 |
| primary-hover 填色邊界 | 14.28 | 13.10 | 12.73 | 12.02 | 12.81 | 11.70 |
| danger 刪除邊線 | 6.90 | 6.33 | 6.15 | 5.81 | 6.19 | 5.66 |
| success badge 邊線 | 7.09 | 6.50 | 6.32 | 5.96 | 6.36 | 5.81 |
| warning 提示邊線 | 6.49 | 5.96 | 5.79 | 5.46 | 5.83 | 5.32 |

**每格均 ≥ 3:1。** 選取的淡底 A 對白僅 1.19:1，因此選取卡片必須同時保留既有 active 邊線並改為 primary（對 A 9.86:1）；不能把淡底本身算成狀態辨識證據。

既有 3px outline 保留 2px／3px offset；其相鄰淺底使用上表。對會直接接觸深色按鈕的既有 focus shadow，`--ui-focus` 對 primary／primary-hover／text 分別為 **3.07／3.74／3.28:1**，對外側淺底也合格。刪除按鈕維持淺色填面與有間距 outline，不新增讓赭金緊貼紅色填面的狀態。把淡藍 shadow 換成不透明焦點色是顏色變動，shadow 半徑與大小完全保留。

### I：反白、漸層與透明層

| 配對 | 對比 | 用途 |
| --- | ---: | --- |
| on-primary／primary | 11.72:1 | 主按鈕、active onboarding、step number、footer feedback（含子元素）。 |
| on-primary／primary-hover | 14.28:1 | hover／pressed。 |
| on-primary／text | 12.55:1 | JS 已使用 `var(--text-dark)` 的深底列印按鈕；只讓其 UI 範圍 alias 取得新值。 |
| on-primary／notice 漸層 primary → primary-hover | 最低 11.72:1 | 只換兩個漸層色，不改角度與 stop。RGB 通道均朝較暗方向，最差值在亮端。 |
| notice content 白字，群組 opacity .95／同漸層 | 最低 10.74:1 | 依群組透明度先合成再算。 |
| notice highlight：白字 + 白色 .2 highlight，再由群組 .95 合成／同漸層 | 6.07 → 7.16:1 | 最差 6.07:1，保持既有透明度。 |
| footer 漸層 P → Q 上的 muted | 最低 5.67:1 | 兩端與中間取樣計算；不得在此放低對比灰字。 |
| UI 文字選取：on-primary／primary | 11.72:1 | 僅在 UI 範圍設定 `::selection` 的 color／background-color，排除試卷與練習紙。 |
| checkbox accent：白勾／primary；primary／S 或 Q | 11.72；11.72／10.44:1 | 設計配對；原生控制項最終繪製方式仍需 Chrome／Safari 實測。 |

caret 可使用 primary，對 S/P/Q/A 分別 11.72/10.75/10.44/9.86:1。既有 Bootstrap 下拉箭頭 `#343a40` 保留，對白底 **11.51:1**，不更換 SVG 或新增圖示。

### E：不冒充必要對比的裝飾

`--ui-divider` 對 S/P/Q 為 **1.41/1.29/1.26:1**；它只能是純裝飾分隔，**不是**合格的控制項邊界。陰影、透明遮罩、紙色與白色表面間的低對比不是文字／必要 UI 的配對，不宣稱它們達到 3:1。modal 文字永遠在不透明白色內容卡片內。停用控制項保留既有 `.55/.6/.65` 等 opacity；其豁免不適用於一般提示或仍可操作的控制項，不能用來替活躍元件開例外。

### 計算方法與重算方式

以 Python 標準函式庫直接計算，沒有使用設計檢查套件。sRGB 通道先除以 255，`c <= .04045` 時取 `c/12.92`，否則取 `((c+.055)/1.055)^2.4`；相對亮度為 `.2126 R + .7152 G + .0722 B`，對比為 `(較亮 L + .05)/(較暗 L + .05)`。透明色先在 sRGB 通道上按實際前後景合成。表格顯示兩位小數，合格判定使用未四捨五入值。

以下可直接以 `python3 -B -` 執行，重算 T/B 與特殊透明配對；它只輸出數值，不寫檔、不需要 Node、不執行 linter：

```python
def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

def luminance(c):
    c = rgb(c) if isinstance(c, str) else c
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in c]
    return sum(v*w for v, w in zip(linear, (.2126, .7152, .0722)))

def contrast(a, b):
    lo, hi = sorted((luminance(a), luminance(b)))
    return (hi + .05) / (lo + .05)

def over(fg, bg, alpha):
    fg = rgb(fg) if isinstance(fg, str) else fg
    bg = rgb(bg) if isinstance(bg, str) else bg
    return tuple(f*alpha + b*(1-alpha) for f, b in zip(fg, bg))

surfaces = ['#FFFFFF', '#F7F5EF', '#EEF3F0', '#E3EEE9', '#FCF2D9', '#E4EAE6']
text = ['#203832', '#52635D', '#123F37', '#0B302A', '#286346', '#80551C', '#953F36']
edges = ['#718178', '#AA7934']
assert contrast('#000000', '#FFFFFF') == 21
assert contrast('#52635D', '#52635D') == 1
for fg in text + edges:
    values = [contrast(fg, bg) for bg in surfaces]
    assert min(values) >= (4.5 if fg in text else 3)
    print(fg, [round(v, 2) for v in values])
for bg in surfaces[:3]:
    print('opacity .6', bg, contrast(over('#091B16', bg, .6), bg))
for bg in ('#123F37', '#0B302A'):
    print('white', bg, contrast('#FFFFFF', bg))
    print('focus', bg, contrast('#AA7934', bg))
    # Whole subtree opacity .95: highlight's effective alpha is .2 * .95.
    print('highlight', bg, contrast(over('#FFFFFF', bg, .95),
                                    over('#FFFFFF', bg, .2 * .95)))
print('footer gradient muted minimum', min(
    contrast('#52635D', over('#EEF3F0', '#F7F5EF', i/1000))
    for i in range(1001)))
```

## 4. 六頁套用計畫與檔案邊界（Phase 2 才實作）

### Cascade 與舊 token 接軌

`tokens.css` 以 `@media screen` 定義 `--ui-*`；六頁各加一行 `<link rel="stylesheet" href="tokens.css" media="screen">`，放在各頁最後一個現有 stylesheet link 之後。首頁必須在 Bootstrap 之後。**除此一行，HTML 保持 byte-identical**：本提案也選擇保留既有四個 `theme-color #f6f8f3`，不新增另外兩頁的 meta。

既有 CSS 的非 screen 區域及原始 `:root` defaults 保留。新的 screen 區塊使用顏色 longhand 或純顏色 token；不重寫 `background`／`border` shorthand，以免重設圖片、寬度或樣式。既有漸層與 shadow 如需整句覆蓋，逐個保留除色彩以外的數值。

| 原 token／介面 | screen UI 範圍內的新值 | 用途與隔離 |
| --- | --- | --- |
| `--bg-page`, `--bg-beige`, `--paper` | `var(--ui-page)` | 只在 UI scope 接軌。兩份 CSS 的 body 只直接改 screen `background-color`，不在 body 重綁所有舊變數或全域文字。 |
| `--bg-card` | `var(--ui-surface)` | UI 卡片。 |
| `--text-main`, `--text-dark`, `--ink` | `var(--ui-text)` | UI 標題／正文；已有 JS 的 `var(--text-dark)` 字串保持原樣。 |
| `--text-muted`, `--muted` | `var(--ui-muted)` | UI 次要字。 |
| `--primary`, `--secondary`, `--primary-sage`, `--accent` | `var(--ui-primary)` | 操作與連結一致；JS 的 `var(--primary-sage)` 字串不動。 |
| `--primary-hover`, `--secondary-hover`, `--primary-sage-dark` | `var(--ui-primary-hover)` | 對應 hover。 |
| `--border-input` | `var(--ui-border)` | 表單與必要邊界。 |
| `--focus-ring` | `var(--ui-focus)` | focus 文字不可誤用此 token。 |
| `--line` | UI 裝飾 scope 可接 divider；元件邊界直接用 border | **不修改 root 的 `--line: #d5dfd5`**。`exam.css .exam-page` 會使用它，改 root 將越界影響考卷。 |
| `--card-shadow` | 保留 `0 10px 30px`，僅色彩改 `rgba(var(--ui-shadow-rgb),.08)` | 僅 UI scope；不碰 `.sheet-page` 陰影。 |
| Bootstrap `.btn-primary` 的色彩變數 | `--bs-btn-color/hover-color/active-color` → on-primary；`--bs-btn-bg/border-color` → primary；`--bs-btn-hover-bg/hover-border-color/active-bg/active-border-color` → primary-hover；`--bs-btn-disabled-color` → muted；`--bs-btn-disabled-bg/disabled-border-color` → disabled-bg | 僅首頁控制區，不改 Bootstrap 檔案。disabled 不作活躍元件合格證據。 |
| Bootstrap focus shadow | `--bs-btn-focus-box-shadow: 0 0 0 .25rem var(--ui-focus)` | 沿用既有幾何；reset 按鈕例外使用 opacity-ink。普通 focus input shadow 同樣只換色。 |

所有 alias 的配對繼承第 3 節矩陣，沒有另一套隱藏色值。`--ui-shadow-rgb` 是三個通道值，不是尺寸 token。

首頁 UI scope 使用現有 `.minimal-header`、`.home-task-entry`、`.smart-card`、`#onboardingModal`、`#legacyControls .col-lg-4`、`#previewSection .empty-state`、`#lineGuide`、`#strokeNoticeModal`、`.ui-pro-footer`、`.data-attribution`、`.stroke-notice/.stroke-tip` 等。不要對 `#legacyControls`、`#previewSection`、`.hero-section` 等練習紙祖先廣泛覆蓋繼承文字或 Bootstrap root variables。

Bootstrap `.text-muted` 有 `!important`，頁尾 `<style>` 又在檔案尾端：使用這些既有 UI scope 的更精確 selector；必要時只在 color longhand 使用 `!important`。首頁靜態 HTML 的 inline 空白狀態 `#999/#666` 可用限定 selector 的 color override 處理，HTML 本身不動。**不以泛用 `!important` 洗掉 JS 內的 literal 顏色。** `.feedback-btn .btn-text` 要直接設定 on-primary，避免子元素仍顯示 muted。

| 頁面 | 預定套用面 | Phase 2 預定檔案 |
| --- | --- | --- |
| `index.html` | 頁底、導航、任務入口、onboarding、推薦卡、既有表單、空白預覽提示、LINE guide、筆順 modal、footer；不進入紙張子樹 | 加一個 link；`styles.css`、`stroke-notice.css`、`attribution.css` 的 screen 色彩覆蓋。內嵌 footer CSS 不編輯，由 `styles.css` 的限定 selector 覆蓋。 |
| `learning.html` | `.tool-page`、header、表單、結果卡、提示、已教狀態、錯誤、focus | 加 link；`learning.css`。 |
| `vocabulary.html` | 同上，加詞庫輸入、挖空選取、預覽／儲存／刪除／出卷控制與歷史清單 | 加 link；`learning.css`、`vocabulary.css`。 |
| `exam.html` | 只改 body 的 screen 頁底、`.page-header`、`#examControls`、`#previewError`、如有的 `.cloud-mode-status` | 加 link；以 `learning.css` 精準選到上述 UI。**不編輯 `exam.css`，不選到 `#examPages`／`.exam-page` 或其子孫，也不改它們繼承的舊變數。** |
| `backup.html` | `.tool-page`、header、資料摘要、備份／還原控制、file input 與確認提示 | 加 link；`learning.css`。 |
| `sync.html` | `.tool-page`、header、說明、登入／同步控制、欄位、提示與錯誤；不觸發真實登入或上傳 | 加 link；`learning.css`、`vocabulary.css`。 |

Phase 2 的允許修改清單總計：新 `tokens.css`、上述五份可編輯 CSS、六頁各一行 link，以及 `docs/ux-color/` 內的文件。其他一律不在此提案實作範圍。

**絕不修改** `styles.css @media print`、`.sheet-page`、`.practice-cell`、筆順／田字格規則、`exam.css`、考卷與答案渲染、任何 JS／MJS（含全部 Data、storage、auth、cloud 模組）、DOM、文案、class/id、尺寸／字型／字重／間距／圓角／border width/style／outline width/style/offset／影子幾何。保留 fonts、stroke-svg、字表與資料來源。亦不編輯 Owner 列出的 memory、governance、work、tests、scripts、supabase、data_engineering、治理文件、PLAN、contract 或 `.gitignore`；不新增套件／字型／圖片、不部署、不執行被禁止的 CLI 或 Git 寫入命令。

## 5. 驗證方式與本階段結論

| 檢查 | Phase 2 的具體驗收 | Phase 1 已有證據／限制 |
| --- | --- | --- |
| 變更範圍 | 與指定 base 比較：HTML 移除唯一新增 link 後 bytes 一樣；CSS 差異只含允許的顏色與 token；JS、保護路徑及原 print blocks 的 bytes 完全相同 | 本階段只交付此文件，無實作差異。 |
| 色彩數值 | 對實際 computed foreground/background 做 alpha 合成；覆蓋 default、hover、pressed、selected、placeholder、error、focus、pulse 最淡時刻；確認 T/B/I 表的門檻 | Python 已計算來源與提案值；未宣稱得到瀏覽器 computed style。 |
| 390px 與 1280px 幾何 | 六頁各用同一 browser、DPR、viewport 高度、字型載入狀態與 fixture，比較 base／after 每個元素的 `getBoundingClientRect()`；以 harness 的逐元素檢查為準，任何位移或尺寸變化都失敗 | 未取得可運作的 Chrome；沒有 bbox、截圖或手機畫面證據。 |
| 顯示狀態 | 首頁 onboarding／自訂文字／課綱／成功狀態；學習查詢空／有結果；詞庫空／有資料、錯誤／選取；考卷／答案；備份空／有資料；同步本機／未登入畫面與可安全呈現的錯誤 | 不用真實雲端寫入補色彩驗證。現有 hidden 狀態與 JS 不動。 |
| 焦點 | 鍵盤逐項巡覽導航、表單、summary、按鈕、skip link、modal、footer；確認原生控制項及 focus shadow、outline 未被 cascade 蓋掉、裁切或因 opacity 變淡 | 尚未觀察。若某元件原本沒有可見 outline/shadow，不能偷偷新增幾何，需記入 OUT_OF_SCOPE。 |
| 練習紙列印／PDF | base 與 after 使用相同自訂文字（例：春夏秋冬）和同一份既有准用課綱生字，各產生一份；在桌面 Chrome 與實機 iOS Safari 比較 A4 頁數、裁切、字型及逐頁 raster pixels，包含既有 PDF 流程 | print CSS、紙張變數與 JS 不會改；但「預期不變」不能代替實際 pixel diff。尚未列印／匯出／比較。 |
| 考卷／答案 | 相同本機詞庫、課次、題數、固定種子；比較考卷與答案在 screen 內容、A4/PDF raster pixels 均相同。exam shell 可換色，試卷內容不可換 | `--line` 的繼承陷阱已識別；未執行輸出驗證。 |
| 測試 | 在已有 Node 的環境執行 `node --test tests/*.test.mjs`，確認原 29 項全部通過，測試檔不動 | 本機沒有可用 Node，**未執行**，不安裝替代工具來冒充通過。 |

Phase 1 可以確認：檔案來源、現有 palette 分裂與數學對比、唯一提案的色值／配對，以及可避免碰到列印的套用方法。**不能確認整站已達 WCAG AA、六頁視覺已驗收、bbox 或印刷畫素未變，也不能宣稱 29 項測試通過。** 其中 JS 固定色的已知問題即使套用此提案也仍存在，見下一節。

## 6. 超出色彩實作範圍的項目

本階段要求「恰好一個檔案」，因此不另建 `OUT_OF_SCOPE.md`。以下保留為 Phase 2 應寫入 `docs/ux-color/OUT_OF_SCOPE.md` 的內容；列出不表示授權修正。

| 位置／項目 | 限制與處置 |
| --- | --- |
| `script.js:23` LINE guide inline `#94a3b8` 小字 | 對白只有 2.56:1；與新配色不一致。JS literal 保留，不用 CSS 強制覆蓋以繞過限制。這是全站 AA 宣稱的已知缺口。 |
| `script.js:281,294` inline 白底、`#eee` 按鈕邊線與分隔線 | `#eee`／白 1.16:1；「明天再來」按鈕邊界仍弱。`var(--text-dark)` 可自然取得 UI alias，但 literal 與 JS 字串不改。 |
| `script.js:295–310` debug control | inline opacity .5 與 JS 切換 `red`／`inherit` 保留。即使改成純黑，.5 合成白底最高也只有 3.98:1；不能用換色讓這個小字達到 4.5:1。紅字對白亦僅 4.00:1。不改 opacity 或除錯行為。 |
| `script.js:943,959,975,993` 筆順輸出 | 固定 `#999` loading、`#ccc` 無資料、`#000000` SVG stroke、`red` 失敗文字保留。前兩者對白為 2.85／1.61:1；屬工作紙／筆順渲染邊界，不因 UI palette 而染色。 |
| 非色彩項目 | 本提案不要求任何版面、間距、字級／字重、文案、資訊架構或互動修改；沒有額外提出 redesign。若之後觀察到焦點幾何缺失、裁切或手機排版問題，只記錄，不在此輪修正。 |
| HTML 既有 footer underline tint 與 theme-color | 保留 `text-decoration-color: #cbd5e1`（不在本輪列舉的可改屬性內）、四頁既有 theme-color；不為一致性修改整段 HTML。 |

補充：`script.js:265,275,284,496` 已有的 `var(--primary-sage)`／`var(--text-dark)` 可隨限定 UI scope 的 alias 取得新色，這不需要修改 JS。其他五頁的模組及 `stroke-notice.js` 未在本次顏色搜尋中發現同類固定色字串；仍整份保持不動。
