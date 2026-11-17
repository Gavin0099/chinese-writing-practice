# 截圖：NOT MEASURED

本環境 `shutil.which` 未找到 node、google-chrome、chromium、chromium-browser 或 playwright。透過 CUA 嘗試開啟本機比較頁，回報 `The browser access host is unavailable`。

未取得可驗證的瀏覽器畫面，因此此目錄沒有 PNG，不以合成圖片或文字示意冒充截圖。

待可用瀏覽器／harness 補拍：

- `comparison.html`：390px 與 1280px 寬度（建議完整頁截圖）。
- 七份獨立 `r*.html`：390×844 與 1280×800，並檢查頁尾。
- 比較頁「手機／桌面」切換、原尺寸連結、鍵盤焦點、200% zoom 與縮圖是否裁切。

上述尺寸是待拍規格，**不是本輪已完成的量測**。


## Round 2

NOT MEASURED：本輪瀏覽器控制再次回報 `The browser access host is unavailable`。PATH 中未找到 node、google-chrome、chromium、chromium-browser 或 playwright；未在工作目錄外搜尋／讀取瀏覽器檔案，也未下載套件。沒有產生或宣稱任何 R2 瀏覽器截圖。`harness-shots/` 完全未寫入、覆蓋或刪除；既有圖片不能代表 R2 驗收。

已提供同目錄上層的 `layout-check.html` 以 390×900／1280×900 比對所有 body 盒模型；本輪未能執行，不能把檢查頁的存在當成量測通過。
