# 首頁視覺探索 · Round 02

入口：**[comparison.html](comparison.html)**。比較頁先放 R0 基準與五個 R2，再完整顯示六個 R1；每版均可獨立開啟。原 Round 1 比較頁另完整封存在 [round-1/comparison.html](round-1/comparison.html)。

Gavin 的回饋是「1–4 都還不錯」：R1-1 晴空藍、R1-2 莓果日常、R1-3 紫藤留白、R1-4 墨白編輯均可接受，尚無單一首選。本輪是 design-exploration **STEP 5：一輪一輪收斂**；沒有替 Owner 定案，也沒有產品實作。新配色不使用綠色，原有 emoji 與 R0 的綠色仍保留。

## 五個 R2 方向

| 編號／獨立頁面 | 源自 | 本輪方向與最大差別 | 詞庫／練習紙／最低文字對比 |
| --- | --- | --- | --- |
| [R2-1 藍墨書房](r2-1-blueprint.html) | R1-1 + R1-4 | 五版中唯一白底、藍墨細框與空心練習紙按鈕；把彩度集中在詞庫入口。 | 7.408／8.891／5.915:1 |
| [R2-2 莓紅印記](r2-2-berrypress.html) | R1-2 + R1-4 | 五版中唯一深酒紅主按鈕、淡粉次按鈕與無模糊的實線投影，視覺像蓋印。 | 9.694／9.382／4.972:1 |
| [R2-3 紫霧墨卡](r2-3-mistink.html) | R1-3 + R1-4 | 五版中唯一淺紫頁底包圍深紫推薦卡；卡內使用亮字與淡紫按鈕，形成局部反白。 | 8.510／10.926／5.864:1 |
| [R2-4 藍莓雙奏](r2-4-blueberry.html) | R1-1 + R1-2 + R1-3 | 五版中唯一冷藍頁底搭配粉色推薦卡，兩個主要按鈕各有一種飽和色，彩度最豐富。 | 7.910／7.363／5.964:1 |
| [R2-5 銀灰紫箋](r2-5-silverlilac.html) | R1-4 + R1-3 | 五版中彩度最低，以炭灰主按鈕、淡紫次按鈕與卡片內層輪廓取代外投影。 | 12.706／8.337／5.630:1 |

每版的理由、最大差異、父版本與取捨也在比較頁和 `directions.json`。以上為每版 20 組指定文字配對的 sRGB 計算（不是實際渲染採樣）；全部 ≥4.5:1，完整數值見 [contrast-round2.json](contrast-round2.json)。不包含 emoji、抗鋸齒、邊框與焦點，不宣稱完整 WCAG 通過。

## 同版面、同內容

- R2 實際從各自第一個 R1 父頁複製後修改，只另存新檔。
- `screen.html` 的產品示意內容逐字沿用；所有頁面的導覽、詞庫入口、練習紙、自訂入口、頁尾、署名與授權均保留。
- `screen.css` 完全不變。R2 的 body／heading／label 字型、三組字重與 heading 字距全部回到 R0，尺寸、留白、圓角、行高和斷點不變。
- R1-3 的 1280px 位移為 Owner 提供的已知問題（15 元素、最大約 7.9px）；沒有修改 R1-3。R2 只取其紫色／平面性格，不沿用 `.025em` 字距。
- 五版用不同配色、實心／空心按鈕、明暗卡面、實線／柔和／內層輪廓分化；刻意不以字型度量變化換取差異。
- R2-3 的卡內副標題／作者說明／回饋提示使用獨立 `card-muted` 色票，以維持深卡文字對比。例外規則只設定 `color`，不修改字型或幾何。

**390px／1280px 的實際 bounding box：NOT MEASURED。** 瀏覽器控制服務回報 `The browser access host is unavailable`。靜態共用 CSS／字體參數一致不等於實測通過；沒有捏造截圖或 1px 通過宣告。另附 [layout-check.html](layout-check.html)，在本機 HTTP 瀏覽器執行時會逐元素比較 R0 與五個 R2，容許差異 1px（固定視窗高度 900px）。這個比對頁未能在本輪執行。

## 開啟與重建

直接開啟 `comparison.html` 或任一 R2 HTML 即可查看；沒有 CDN、網路字型、圖片、npm、fetch 或產品腳本。尺寸切換只服務比較頁，首頁按鈕維持示意。

從 repo 根目錄開本機服務（所有檔案引用仍是相對路徑）：

```sh
python3 -B -m http.server 8765 --bind 127.0.0.1 --directory .
```

瀏覽器開啟本機服務後進入 `design-exploration/comparison.html`；幾何檢查入口是同目錄的 `layout-check.html`。比較縮圖聚焦主操作區，獨立頁面保留完整頁尾。

```sh
python3 -B design-exploration/build-round2.py
python3 -B design-exploration/verify-round2.py --serve-check
python3 -B design-exploration/round-1/verify.py
```

`build-round2.py` 只重建 R2 與當前比較／資料，不會重建 R0／R1。舊的 `build.py` 與 `verify.py` 保留供歷史追溯；**目前請使用 `build-round2.py`／`verify-round2.py`**。原 `build.py` 只了解 Round 1，不應用來重建本輪總覽。

## 檔案與歷史

- 新建：五個 `r2-*.html`、`themes-round2.css`、`round2-directions.json`、`contrast-round2.json`。
- 新建：`comparison-round2.css`／`.js`，只供比較頁使用；原 `comparison.css`／`.js` 不變。
- 新建：`build-round2.py`、`verify-round2.py`、`layout-check.html`／`.js`、`round1-preservation.json`。
- 封存：`round-1/` 含原 21 個頂層檔案與 `shots/README.md`；修改前記錄 SHA256，可重現原比較頁。
- 更新：`comparison.html`、`directions.json`、`README.md`、`QUESTIONS.md`、`SOURCE-NOTES.md`、`VALIDATION.md`，以及 `shots/README.md` 的本輪量測限制。
- 保留原位且位元組不變：`r0-current.html`、全部 `r1-*.html`、`screen.html`、`screen.css`、`themes.css`、`contrast.json`、原比較頁 CSS／JS、原 build／verify。
- `harness-shots/` 沒有寫入、覆蓋或刪除；不是本輪驗證產物。

## 假設、技能與界線

[QUESTIONS.md](QUESTIONS.md) 保留 Round 1 問答，新增 Round 2 的假設答案；沒有要求 Owner 回答或挑色碼。`design-exploration` 僅執行 STEP 5，沿用 STEP 2 基準與 STEP 4 版本，未進入 STEP 6。`ui-ux-pro-max` 用於需求分析、`--design-system`、style／color／typography／ux 搜尋，以及適用的靜態檢查。精確命令、採用／未採用理由與觀察限制見 [VALIDATION.md](VALIDATION.md) 及 [SOURCE-NOTES.md](SOURCE-NOTES.md)。

本輪只寫入 `design-exploration/`。產品、測試、memory、治理與設定未修改；列印／PDF、考卷／解答、練習紙 A4、田字格、描紅、筆順 SVG、資料契約、演算法、Auth／RLS／備份／同步均不在本輪變更中。未 commit、push、branch、checkout、reset 或部署，未查看其他分支、refs 或 remote history。

目前交付的是可供選擇的 R2 方向；Owner 明確指定後才整理定案 token 並進入產品實作。本輪沒有預先安排實作。
