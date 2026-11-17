# 重建依據與視覺變數

這是首頁的離線靜態重建，不是原站截圖；不宣稱像素一致。工作目錄以外的技能、檔案與網路資源均未作為設計來源。

## 來源與固定狀態

- `../index.html:57–110`：品牌／三個工具連結、老師詞庫任務區、推薦卡與自訂設定入口。
- `../index.html:292–506`：原頁尾文案與畫面樣式，保留資料來源署名與授權文字。預覽的來源文字不是外連。
- `../styles.css:988–1345`、`1949–2005`：首頁最終 cascade、幾何值、導覽與任務入口樣式。
- `../styles.css:894–900`：`.container` 已被後段規則設成 `display:block !important`、`padding:0 !important`、`width:auto !important`；重建不是重新排成卡片網格。
- `../script.js:184–223`、`458–496`：載入後的年級、課名、提示與下載按鈕。未執行腳本；固定為尚未輸出的第一課示意。
- `../curriculum_data.js:1–24`：既有一年級上學期第 1 課名「拍拍手」。只引用課名；沒有匯入、複製或重建字表。
- `../docs/ux-task2/PLAN.md`：只核對既有首頁任務順序及保護界線，沒有接續其實作工作。

沒有載入 `script.js`、Bootstrap、HanziWriter、cnchar、PDF 工具或任何資料模組。按鈕為 disabled，導航文字為靜態 span，保留其原本的視覺位置；不存取 localStorage、Supabase 或帳號資料。比較頁唯一的 JavaScript 只縮放 iframe。

## 現況 token 與寫死的顏色

| 角色 | 來源值／有效狀態 | 重建對應 |
| --- | --- | --- |
| 背景 | CSS 有 `--bg-beige: #F5F5F0`；但 index 最後載入 Bootstrap 5.3，body 的預設白底覆蓋前者 | R0 使用 `#FFFFFF`；此 cascade 推論未用真實原站量測 |
| 主要字色 | `--text-main: #334155`、`--text-muted: #64748B` | 課名／副標題 |
| 老師入口標題／說明 | `#24352D`／`#52645A` | entry-text／description |
| 詞庫按鈕／導覽／焦點 | `#305B47`；hover `#254A39` | primary／nav／focus |
| 練習紙按鈕 | 靜態 CSS `#8FA298`；script.js 載入後指定 `var(--primary-sage)`，值為 `#8DA399` | R0 以載入完成狀態的 `#8DA399` 為準 |
| 練習紙按鈕 hover | `#7B8E84`；另有早期 token `--primary-sage-dark:#6C8279` | 色票記錄 hover；預覽不模擬產品操作 |
| 淡提示 | `#A0AEC0` | hint |
| 分隔線／卡片輪廓 | `#D5DFD5`／`rgba(0,0,0,.03)` | rule／card-border；白底輪廓以合成色 `#F7F7F7` 摘要 |
| 陰影 | 卡片雙層黑色 5%；按鈕 `rgba(143,162,152,.3)` | R0 保留；R1 依方向改為輕陰影、實線投影或無陰影 |
| 頁尾 | 漸層 `#F8FAFC → #F1F5F9`；署名 `#94A3B8`；連結 `#64748B` | R0 保留色系，漸層對比取兩端最小值 |
| 授權標籤／回饋按鈕 | `#F0FDF4`、`#166534`、`#BBF7D0`／`#60A5FA` | 新方向一併使用自己的 UI 色系，署名文字保留 |

舊表單、首次設定、輸出成功狀態的 `#4F46E5`、`#0EA5E9` 等不在這個固定畫面內。工作紙的格線、描紅與 A4 變數完全不複製到預覽。

## 共用幾何，不是新排版

| 項目 | 所有方向共用 |
| --- | --- |
| header | 16px／32px 內距；小於 36rem 改 16px 水平內距；導覽依原本 flex wrap 折行 |
| 主區 | 32px 內距、flex column、70vh 最小高度 |
| 老師入口 | 最大 46rem、底部 24px 內距、32px 外距、1px 底線、24px 標題 |
| 推薦卡 | 最大 450px、48px 內距、24px 圓角、32px 底部外距、1px 輪廓 |
| 課名 | 44.8px、1.2 行高、40px 底部外距；只變字型／字重／字距 |
| 詞庫按鈕 | 48px 最小高度、12px／20px 內距、8px 圓角 |
| 練習紙按鈕 | 16px／40px 內距、99px 圓角、18.4px 字級 |
| 自訂入口 | 原位置、44px 最小高度 |
| 頁尾 | 原內容與區塊順序；64px 上距、48px／16px 內距；640px 斷點 |

只提供一份 `screen.html` 片段和 `screen.css`。`themes.css` 的七個方向規則只包含視覺變數，沒有尺寸、排序、display 或 positioning 覆寫。比較頁自己的網格、導航與縮放不是產品首頁提案的一部分。

## 離線重建限制

原站依賴外部 Bootstrap 和 Google 字型；本輪禁止外部資源，所以以本地、手寫 CSS 摘要其 reset／cascade，不下載第三方套件。系統黑體、圓體、明體、等寬的可用性依裝置不同；四個黑體方向也用不同字重／字距區分，沒有聲稱每台裝置都會顯示六套不同字型。

既有 emoji 保留，不新造 icon 家族。圖示的實際彩色字形依作業系統而異。頁尾保留文字與結構，但未以原站瀏覽器截圖校準個別繼承細節。上述字型差異、Bootstrap 的未逐條重建細節、折行與原站像素差均為 **NOT MEASURED**。

## 採用的技能資料

- `.agents/skills/design-exploration/SKILL.md` 與其 `templates/comparison.html`：沿用第 0 欄基準、同片段、方向陣列、理由／差異／對比欄位、手機與桌面切換；模板的固定寬度外框改成自適應比較頁，避免比較頁自身橫向溢出。
- `.agents/skills/ui-ux-pro-max/SKILL.md`：跑過 design-system、style、color、typography 搜尋。採用 Flat Design／Minimalism 的清楚層級、低裝飾、可辨讀配色與字重分化。
- `education parent teacher tool` 回傳兒童 Claymorphism；`teacher productivity tool minimal` 重試後回傳 Flat Design。保留後者的工具型表面策略，不使用其青綠／橘色色票。
- `education productivity monochrome` 及 `education children` 回傳含綠色的 Productivity／LMS 色票，與 Owner 回饋不合，沒有照套。`minimal monochrome` 的 Portfolio 分類只作黑白方向的配色參考，沒有套用作品集版面。
- `Chinese traditional readable` 回傳繁中 serif／sans 配對；`geometric rounded technical` 回傳圓體與幾何字體處理。轉譯成系統 fallback，不下載 Google 字型、不改練習紙字型。
- `bold monochrome neumorphism flat` 的 Neumorphism 偏健康工具且有對比風險，未採用；以 `flat design` 縮小重試，取得正確 Flat Design 條目。
- 閱讀 `references/pro-rules.md` 後辨識其為 native/mobile 範圍；本頁依 `references/quick-reference.md` 的 accessibility、touch、performance 條目做 web 適用的靜態檢查。不把 native 檢查當作網頁或 iPhone 驗收證據。
