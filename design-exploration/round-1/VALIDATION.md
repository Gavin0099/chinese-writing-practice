# 驗證紀錄

2026-11-17。這是視覺探索的靜態與供檔檢查，不是產品功能或列印驗收。

## 實際使用的技能步驟

### design-exploration（僅工作目錄版本）

- 先列出 `.agents/skills/`，讀取其中兩份 `SKILL.md`；沒有讀其他位置的技能。
- 步驟 0：判定為整頁視覺方向，採完整發散流程。
- 步驟 1：非互動條件下將八題與已知答案／假設寫入 `QUESTIONS.md`。
- 步驟 2：讀取首頁 HTML／CSS／JS、現有課名；重建固定狀態基準，整理現況 token、尺寸與離線差異至 `SOURCE-NOTES.md`。
- 步驟 3：版面已被 Owner 接受，跳過線框圖，不提新版面。
- 步驟 4：以其 `templates/comparison.html` 的基準／方向陣列／共用內容／寬度切換模式為起點，產出 R0 + 六個 R1；每版含理由、差異、取捨、字體處理及色彩對比計算。
- 步驟 5：等待 Gavin 看圖選方向；未進入收斂。現有版本全部保留。
- 步驟 6：未執行產品實作。沒有將方向套進產品 CSS／JS。

### ui-ux-pro-max（僅工作目錄版本）

實際執行的搜尋如下。每一行均加上 `PYTHONDONTWRITEBYTECODE=1`，避免技能目錄產生 `__pycache__`。沒有使用 `--persist`，也沒有新增依賴。

```sh
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "education parent teacher tool" --design-system -p "Chinese Writing Practice Exploration"
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "minimal flat swiss accessible" --domain style -n 5
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "education productivity monochrome" --domain color -n 5
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "Chinese traditional readable" --domain typography -n 4
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "teacher productivity tool minimal" --design-system -p "Parent Teacher Workbench"
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "education children" --domain color -n 3
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "bold monochrome neumorphism flat" --domain style -n 4
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "geometric rounded technical" --domain typography -n 3
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "flat design" --domain style -n 1
PYTHONDONTWRITEBYTECODE=1 python3 .agents/skills/ui-ux-pro-max/scripts/search.py "minimal monochrome" --domain color -n 1
```

逐一閱讀回傳類別與適用性；對不符合的兒童 Claymorphism／Neumorphism 縮小重試；不採用綠色色票和所有外部字型連結。採納細節記於 `SOURCE-NOTES.md`。讀取 `references/pro-rules.md`，辨識其 native 範圍，並以 `references/quick-reference.md` 第 1–3 類作網頁適用的靜態檢查：對比、標籤、可見焦點、減少動態與無外部字型資源。未使用 stack 搜尋，因專案是純 HTML/CSS/JS + Bootstrap，資料庫沒有精確對應的 stack，不冒充 Tailwind。

## 產出與輕量檢查命令

```sh
python3 -B design-exploration/build.py
python3 -B scripts/preview.py
python3 -B design-exploration/verify.py --serve-check
git diff --stat
git diff --exit-code -- . ':!design-exploration'
git status --short
```

另以 Python `shutil.which` 查詢 `python3`、`node`、`google-chrome`、`chromium`、`chromium-browser`、`playwright`；只有 `python3` 找到可用命令。沒有執行可寫到 `docs/` 的 review fixtures，也沒有執行產品測試。

## 實際結果

| 檢查 | 結果與可主張範圍 |
| --- | --- |
| 產生器 | 成功產生七份獨立畫面、比較頁與視覺 token；無 build 即可閱讀產出。 |
| 共用內容 | 七版都包含同一份 `screen.html`，字串一致；共用幾何 CSS。只對視覺 token 做各版覆寫。 |
| 相對引用 | 所有 HTML 的 href／src 限定資料夾內的相對路徑；連結與錨點存在、沒有重複 id。 |
| 資源界線 | 靜態掃描無 CDN／外部字型／圖片／@import；七份畫面沒有 script，comparison.js 沒有 fetch、storage 或資料 API 呼叫。這不替代瀏覽器 network log。 |
| 對比 | 119 組配對重新計算，102 組 R1 配對全部 ≥4.5:1；R0 保留 6 組不足。驗證黑白 21:1、同色 1:1 邊界。 |
| localhost 供檔 | `verify.py --serve-check` 對比較頁及所有 HTML 引用的本地資源檢查 HTTP 200 與回傳位元組一致。 |
| 產品差異 | `git diff --exit-code` 成功，受追蹤產品檔案沒有差異；`git status --short` 僅原本的 `.agents/` 與新增的 `design-exploration/`。 |
| 技能目錄副作用 | 掃描沒有產生 `.pyc` 檔案。 |

第一版臨時靜態掃描因 comparison.js 註解含「fetch」一字觸發失敗，未作通過宣告。將掃描限制到排除註解後的程式，再以 `verify.py` 重跑；沒有更動產品或忽略真實 API 呼叫。

| 方向 | 17 組指定字色最小對比 | 不足 4.5:1 組數 |
| --- | ---: | ---: |
| R0 現況 | 2.256:1 | 6 |
| R1-1 晴空藍 | 5.710:1 | 0 |
| R1-2 莓果日常 | 5.829:1 | 0 |
| R1-3 紫藤留白 | 5.603:1 | 0 |
| R1-4 墨白編輯 | 5.546:1 | 0 |
| R1-5 鉛筆黃 | 6.183:1 | 0 |
| R1-6 夜讀靛藍 | 7.878:1 | 0 |

這些數字是指定前景／背景色票的 sRGB 計算，不包含 emoji、邊框、焦點、抗鋸齒、實際字型、明暗適應或整個畫面的無障礙驗收。未聲稱符合整套 WCAG。

## NOT MEASURED

- CUA 開啟本機頁面回報 `The browser access host is unavailable`；沒有可用的瀏覽器截圖。
- 390px／1280px 真實 render、文字折行、畫面溢出、縮圖裁切與兩種模式的實際操作。
- 直接 file 開檔的瀏覽器觀察、實際網路請求紀錄、JavaScript runtime console。
- 原站與 R0 的像素一致性；外部 Bootstrap 細節、實際 fallback 字型。
- 螢幕閱讀器、鍵盤實際焦點順序、200% zoom、iPhone／iOS Safari、Windows Chrome。
- 列印／PDF、考卷、解答、練習紙 A4、田字格與描紅的輸出回歸。產品程式未改，不等於量測過輸出。
- Gavin 的偏好、最終選擇與使用者測試。

未執行 commit、push、branch、checkout、reset、部署，未查看其他分支、refs 或 remote history；未執行 wrangler／supabase／firebase 或 Cloudflare 操作。
