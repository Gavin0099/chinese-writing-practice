# 首頁字體探索 · Round 03

入口：**[comparison.html](comparison.html)**。Round 3 六組新字體放在最前，第一欄仍為 R0-0；接著是全部五個 R2、全部六個 R1，共 18 版。每一版都有獨立頁面。歷史總覽完整封存在 [Round 2](round-2/comparison.html) 與 [Round 1](round-1/comparison.html)。

Gavin：「**加入字體變化看看 2-1 2-2 2-4看起來都不錯**」。本輪是 design-exploration **STEP 5：一輪一輪收斂**，保留 R2-1 藍墨書房、R2-2 莓紅印記、R2-4 藍莓雙奏的完整配色與表面處理，只探索字體；仍未定案、未進入產品實作。不提出綠色新方案、不要求挑色碼。

## 六組 R3 字體

| 獨立頁面 | 父版 | 標題 | 正文 | 一句方向／最大差別 | 詞庫／練習紙／最低對比 |
| --- | --- | --- | --- | --- | --- |
| [R3-1 藍墨粗黑](r3-1-bluebold.html) | R2-1 | 粗黑體 800 | 系統黑體 400 | 最厚的黑體標題，清楚而有效率。 | 7.408／8.891／5.915:1 |
| [R3-2 莓果圓讀](r3-2-berryround.html) | R2-2 | 圓體 700 | 圓體優先 400 | 唯一標題、正文都優先圓體，像親切的陪讀文具。 | 9.694／9.382／4.972:1 |
| [R3-3 藍墨明讀](r3-3-blueming.html) | R2-1 | 明體 700 | 繁中黑體 400 | 與 R3-1 同色，直接比較明體筆畫與粗黑輪廓。 | 7.408／8.891／5.915:1 |
| [R3-4 藍莓楷語](r3-4-blueberrykai.html) | R2-4 | 楷體 700 | 繁中黑體 400 | 唯一楷體筆意標題；字形只供首頁風格比較。 | 7.910／7.363／5.964:1 |
| [R3-5 莓紅書頁](r3-5-berryreading.html) | R2-2 | 黑體 700 | 明體 400 | 唯一明體正文，以紙本閱讀感與圓體版對照。 | 9.694／9.382／4.972:1 |
| [R3-6 藍莓輕圓](r3-6-blueberrysoft.html) | R2-4 | 圓體 500 | 繁中黑體 500 | 輕標題搭配較實的正文，雙色下較清爽的圓潤方向。 | 7.910／7.363／5.964:1 |

字重為 CSS 請求值；實際字面依裝置可用性，可能使用最接近字重或合成粗體。每版標題、正文的**完整 font stack、Windows／iPhone 分別的退回鏈**，均列於比較卡片的展開說明與 [round3-directions.json](round3-directions.json)。標題涵蓋課名及老師入口標題；正文涵蓋品牌、導覽、說明、提示與操作文字。較小的授權與作者頁尾仍固定使用 R0 黑體，避免降低辨讀性。

所有配色取自父版，六版共 **120 組指定文字對比皆 ≥4.5:1**，見 [contrast-round3.json](contrast-round3.json)。這是重新執行 sRGB 色票計算；沒有量測字形、抗鋸齒、emoji、邊框或完整 WCAG。

## 系統字型與下載成本

- 黑體：PingFang TC／Microsoft JhengHei／Heiti TC，或 system-ui 的 San Francisco／Segoe UI 與繁中 fallback。
- 圓體：Yuanti TC 優先；標題另嘗試 Hiragino Maru Gothic ProN、Arial Rounded MT Bold，最後退回 PingFang TC／Microsoft JhengHei。**不是 Windows／iPhone 的保證預裝字型；缺少時中文仍會顯示黑體。** Arial Rounded 只能覆蓋其支援字元，不能把它當繁中圓體。
- 明體：Songti TC → PMingLiU → MingLiU → serif。Windows 的細明體可能需要繁中補充字型；iOS 以本機 Songti TC 可用性及 Safari 的 serif fallback 為準。
- 楷體：Kaiti TC → STKaiti → DFKai-SB → BiauKai → KaiTi → PingFang TC → Microsoft JhengHei → serif。沒有楷體時退回清楚的黑體，不能保證每台裝置都顯示楷書。
- **新增字型資源 0 B，沒有 @font-face、CDN、Google Fonts、@import 或外部請求。** 若要跨平台保證同一款繁中圓體／楷體，需要另行核對授權的 web font，本輪未加。
- 只讀核對 `fonts/README.md`、`fonts/font-face.css` 與 `fonts/edukai-4.0.ttf` 的大小。檔案為 **15,785,556 bytes（15.05 MiB）**；未引用、未複製、未修改，實際新增傳輸 0 B。README 的授權摘要不是本輪新增授權查核；原頁尾署名保持不變。

## 同內容、同版面與度量限制

每個 R3 先 `shutil.copyfile` 複製父 R2 頁，再修改新檔。`screen.html` 片段逐字不變，body 的 **51 個元素**與 R0 的標籤順序相同；`screen.css`、所有 R0／R1／R2 頁與樣式均不改。

保留 R0 字級：課名 44.8px、入口標題 24px、主要正文 16px；正文主要行高 1.5／1.6。R3 使用本機 `typography-round3.js`：先在**同一份可見 DOM**暫時使用 R0 字型讀取尺寸，再保留 header／home-container 中各元素的 border-box 寬高及行高，套用新字型。若新字體改變折行，優先調整字距（原值 ±0.8px），必要時字級最多縮 6%，重現原文字節點的換行起點。視窗尺寸改變後重新校準。

不新增隱藏基準頁、不重建第二套文字、不改文案、不使用文字圖片／水平壓縮／省略號／新增裁字規則。原本卡片的 overflow 規則未改。校準程式會列出尺寸偏差、無法保留折行與新增溢出，失敗標記 `NEEDS REVIEW`。這是探索用途的尺寸限制，不是產品排版方案；未定案，也未做 zoom／使用者字距覆寫的無障礙驗收。沒有 JavaScript 時仍顯示字體，但不執行尺寸校準，該模式不保證 1px。

**390／1280px 真實 bounding box、折行、溢出、截圖及實際 fallback：NOT MEASURED。** CUA 回報 `The browser access host is unavailable`；PATH 沒有可用的 Node／Chrome／Playwright CLI，本輪未直接啟動 headless Chrome。靜態結構一致與校準程式存在，都不等於通過外部 harness。

[layout-check-round3.html](layout-check-round3.html) 會在本機瀏覽器以 390×900、1280×900，獨立比對 R0 與六版的 body 及所有後代元素（含頁尾與探索說明），列出 x/y/width/height 超過 1px 的位置，另比較原文字節點的換行。它未能在本輪執行；不讀寫 `harness-shots/`。

## 開啟與重建

直接開 `comparison.html` 或任一 R3 HTML 可看提案。本機 HTTP 可避免跨檔案來源限制；從 repo 根目錄執行：

```sh
python3 -B -m http.server 8765 --bind 127.0.0.1 --directory .
```

進入 `http://127.0.0.1:8765/design-exploration/comparison.html`。完整頁面不載入產品腳本，所有產品按鈕皆為示意。

```sh
python3 -B design-exploration/build-round3.py
python3 -B design-exploration/verify-round3.py --serve-check
```

重建器只寫 R3 及當前 `comparison.html`／`directions.json`，不重建歷史。**不要在根探索資料夾執行舊 build.py／build-round2.py**，它們只理解先前輪次，會把總覽退回舊輪。原檔保留供歷史追溯。

## 檔案、保留與實際技能

- 新建：六個 `r3-*.html`、`round3-directions.json`、`contrast-round3.json`、`typography-round3.css`／`.js`、`comparison-round3.css`／`.js`、`build-round3.py`、`verify-round3.py`、`layout-check-round3.html`／`.js`、`round2-preservation.json`。
- 封存：`round-2/` 原樣複製修改前 59 份檔案（含當時的 Round 1 封存），所有相對連結仍可用。
- 更新：`comparison.html`、`directions.json`、`README.md`、`QUESTIONS.md`、`SOURCE-NOTES.md`、`VALIDATION.md`。
- 保留：R0、六個 R1、五個 R2 原頁；共用片段、幾何 CSS、各輪配色、資料與舊生成／驗證器皆保留原位且雜湊不變。對照頁按 Round 3／2／1 分組，R0 第一欄。

本輪重讀工作目錄內兩份 SKILL.md。`design-exploration` 用 STEP 5，沿用 STEP 2 基準與 STEP 4 歷史，補上非互動的 Round 3 假設，未執行 STEP 6。`ui-ux-pro-max` 用需求分析與針對性的 `--domain typography`／`--domain ux` 搜尋；不是新頁面／新配色系統，所以沒有重跑 `--design-system`。精確命令、採納理由、檢查結果見 [VALIDATION.md](VALIDATION.md)／[SOURCE-NOTES.md](SOURCE-NOTES.md)。

假設「2-1、2-2、2-4 不錯」沒有排名；主要使用者仍是手機上的台灣家長／老師；只用已知回饋收斂，不替 Gavin 定案。

所有寫入都在 `design-exploration/`。`harness-shots/`、fonts、產品、測試、memory、PLAN 與治理檔案均未修改。列印／PDF、考卷／解答、練習紙 A4、田字格、描紅、筆順 SVG、資料契約、演算法、Auth／RLS／備份／同步保持受保護。沒有 commit、push、branch、checkout、reset、部署或查看其他 refs／remote history。
