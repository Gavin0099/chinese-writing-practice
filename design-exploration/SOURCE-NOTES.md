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


## Round 2：複製來源、取捨與幾何策略

本輪只讀目前工作目錄內的技能與檔案。重讀 README、comparison、directions、QUESTIONS、SOURCE-NOTES、VALIDATION、兩份技能與相關生成／共用檔。未重新連線讀原站、下載圖片／字型或執行產品程式。

新頁由 `build-round2.py` 對第一父版執行 `shutil.copyfile`，再修改 R2 目標。來源為已封存的原頁；`copied_from` 記於 `round2-directions.json`／`directions.json`，多個視覺父版另以 `parents` 陣列保存：

| 新版 | 實際複製的頁面 | 視覺來源與新增差異 |
| --- | --- | --- |
| R2-1 藍墨書房 | R1-1 晴空藍 | 加入 R1-4 的輪廓／明體；白底、藍灰卡與空心次按鈕。 |
| R2-2 莓紅印記 | R1-2 莓果日常 | 加入 R1-4 的明確輪廓；白卡、深酒紅主色、淡粉次按鈕與實線投影。 |
| R2-3 紫霧墨卡 | R1-3 紫藤留白 | 加入 R1-4 的強明暗對比；淺紫底、深紫卡與反白文字。 |
| R2-4 藍莓雙奏 | R1-1 晴空藍 | 混合 R1-2 莓紅與 R1-3 淡紫；藍底粉卡、雙色任務入口。 |
| R2-5 銀灰紫箋 | R1-4 墨白編輯 | 加入 R1-3 的低彩度紫；銀灰雙層內框、炭灰主按鈕與淡紫次按鈕。 |

每個 R2 的產品片段與 R0 完全相同。共用 `screen.css` 位元組不變；三種 font-family、三種 font-weight 與 `heading-tracking` 都從 R0 複製。沒有 font-size、line-height、letter-spacing、padding、margin、border-width、position 或 transform 的 R2 覆寫。表面差異只使用 background、既有 border 顏色和 box-shadow；陰影不參與 CSS 盒模型。

R2-3 為深卡／淺頁混合，不能讓一個灰字 token 同時負責兩種背景。R2 新增 `card-muted`，僅用於既有 `.hero-subtitle`、`.author-text p`、`.feedback-hint` 的 `color`。所有 R2 都宣告此色票，並依實際配對計算；不透過改字級或裁字迴避對比／折行問題。底部探索說明保持原樣式，各新版只替換等長的版本名稱與回比較頁錨點。

Owner 回報的 R1-3 位移（1280px、15 元素、約 7.9px）是外部提供的已知問題，不冒充本輪自行重測結果。本輪不讀寫 `harness-shots/` 的內容；R2 幾何預防靠 R0 文字度量一致，實際 DOM 幾何仍待瀏覽器觀察。

### 本輪技能搜尋的採用與未採用

- `teacher productivity tool minimal --design-system`：Flat Design 的低裝飾與清楚工具表面適用；影片／Product Demo 版面不適用，青綠／橘配色和 Google 字型不採用。保留已接受首頁佈局。
- `minimal flat editorial --domain style`：Minimalism & Swiss Style 適合工具的輪廓與層級；只取視覺處理，不套其零圓角、12 欄格線或建議尺寸。
- `editorial blue pink --domain color`：Magazine/Blog 的黑白＋粉色、Parenting & Baby Tracker 的粉＋藍可作配色組合參考；不是本產品分類，不導入雜誌／育兒追蹤版面。Short Video Editor 不適用。五版實際色票依父版與對比計算另行設計。
- `Chinese traditional readable --domain typography`：第一名 Chinese Traditional（serif＋sans）符合繁中；因幾何鎖定與離線限制，保留 R0 的本機明體／黑體配對，不下載 Noto 字型、不採用簡中第二名。
- `text reflow layout stability --domain ux` 第一名是 chip collection、第二名才是 Text Reflow and Spacing；用 `text reflow spacing` 縮小重試後第一名即符合。採用保留文本、內容自適應高度、不裁字的原則，未動產品原有布局。
- `references/pro-rules.md` 的 checklist 屬 native/mobile；只讀作對照，未把它說成 iOS／Android 驗收。`references/quick-reference.md` 的 web 對比、焦點、viewport、動態／資源條目用於靜態核對。

沒有套用 skill 的新增 SVG 圖示建議，因 Owner 要求內容相同、保留既有 emoji；沒有採用外部字型與影像。純 HTML/CSS/JS 原型沒有資料庫內精確 stack，因此未冒用 `html-tailwind` 或其他框架指引。精確搜尋命令見本輪 VALIDATION 紀錄。
