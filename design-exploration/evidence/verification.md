# 驗證紀錄

範圍：獨立視覺探索。正式首頁、考卷、解答、練習紙、列印、田字格、描紅、筆順、資料契約、演算法、Auth／RLS／備份／同步與所有既有 tests 皆不執行、不修改。

## 已執行

1. 讀取目前 `index.html`、`styles.css`、`script.js` 的首頁結構與相關規則。保留導覽 → 詞庫與出卷 → 推薦練習紙 → 自訂設定 → 頁尾順序。共用版型保留標頭 padding、hero padding、container 斷點、450px smart-card／48px padding／24px 圓角、課名字級 2.8rem，以及原有頁尾排列。預覽按鈕改為同樣 class 的純文字 span，避免執行產品行為。
2. 在任何產出前，用 Python 標準函式庫記錄工作目錄內 1,028 個檔案雜湊。交付前再次比對。`.git` 與 symlink 的目標內容不讀取；沒有執行 git 命令或查看 refs。結果見 `checks.json`。
3. 透過 `python3 -B design-exploration/verify.py --http-root http://127.0.0.1:8766/` 檢查相對資源、三案 body 一致、theme 只含 paint 屬性、無 CSS URL／import、來源檔未變及 HTTP 回應。
4. 依 sRGB 相對亮度公式計算每案 10 組實際使用的前景／背景。三案最低 A 4.73:1、B 4.62:1、C 4.64:1；詳見 `contrast.json`。裝飾分隔線與色票不當作文字對比宣稱。未宣稱完整 WCAG 驗收。
5. 原始碼確認：比較頁有 viewport meta、語意 radio、選中狀態、44px 檢視控制、focus-visible、skip link、reduced-motion；760px 以下三案垂直堆疊。預覽沒有產品模組、font-face、外部資源、storage／API／列印呼叫。這些是靜態檢查，並非實際操作證據。

## 瀏覽器嘗試與限制

- `python3 -B scripts/preview.py` 因 8765 已被占用失敗；使用 `--port 8766` 成功。本機 HTTP 200 只能證明可取得資源。
- `cua.createBrowserTab("iab", "http://127.0.0.1:8766/design-exploration/comparison.html", { visible: true })` 回報 browser access host unavailable。
- `Google Chrome --version` 可執行：157.0.8103.79。
- 本機 Chrome 的 headless + remote-debugging 啟動 exit 134；改為 headless + disable-gpu + dump-dom 仍 exit 134。兩次皆指定本資料夾內的 user-data-dir，無可分析的 stderr，也沒有建立 profile 目錄或截圖。
- 沒有安裝套件、修改系統設定或取得額外權限。

| 項目 | 結果與界線 |
| --- | --- |
| 390px / 1280px 畫面、裁切、橫向捲動 | **NOT MEASURED**；有對應 CSS，不能據此宣稱視覺通過。 |
| 三案切換、iframe 自動高度、鍵盤 focus、JS runtime | **NOT MEASURED**；只有原始碼檢查。 |
| 直接以 file:// 開啟 | **NOT MEASURED**；設計為相對路徑，未實際瀏覽器操作。 |
| 與原網站遠端字型載入後的像素一致性 | **NOT MEASURED**；未載入外部字型或 CDN。保留幾何規則與字體角色，不宣稱逐像素複刻。 |
| iOS Safari、實機觸控、螢幕閱讀器、200% 縮放 | **NOT MEASURED**。 |
| A4、PDF、描紅、田字格、筆順、出卷及所有資料流程 | **NOT MEASURED**；未載入或執行，只以來源雜湊確認沒有修改。 |
| Gavin 的偏好、可用性提升、產生時間 | **NOT MEASURED**；A 是設計建議，沒有使用者驗收或效能推論。 |

本資料夾內的原始碼與計算結果可供 harness 後續驗證；這份紀錄不把預期行為包裝成實測結果。
