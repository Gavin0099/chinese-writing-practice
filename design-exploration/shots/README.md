# 截圖狀態：NOT MEASURED

本輪未取得瀏覽器截圖，因此沒有 PNG。

- CUA 嘗試開啟本機比較頁，回報 `The browser access host is unavailable`。
- shell PATH 中沒有 node、nodejs、chromium 或 google-chrome。
- 直接執行已安裝 Chrome 的 `--version` 成功：`Google Chrome 157.0.8103.79`。
- headless 啟動（指定本資料夾內的使用者設定／快取目錄）以 exit 134 結束。
- 加入 `--disable-gpu`、改用 `--dump-dom` 的第二次嘗試也以 exit 134 結束，沒有可供分析的 stderr。

沒有修改系統設定、安裝瀏覽器或套件，也沒有改動產品以配合截圖。390px／1280px 的實際排版、橫向溢出、iframe 高度與選案切換均為 **NOT MEASURED**，交由可用的瀏覽器／harness 檢查。這個說明不代表頁面已通過視覺驗收。
