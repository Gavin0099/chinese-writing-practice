# F-00 分離練習紙輸出與家長確認進度

舊版 `write_practice_data.settings.lastLesson` 來自練習紙流程，連預覽也可能寫入。遷移時將它讀為 `lastOutputLesson`，供推薦下一課。舊資料保留設定、歷史和選課，`lastOutputAt` 只來自這版實際啟動的輸出。

家長確認進度使用獨立的 `write_practice_teaching_progress` 儲存鍵。讀取只接受 `confirmed: true` 的記錄，其餘欄位依 F-02 契約判讀。F-01 負責設定及確認介面。預覽與自訂文字保有現有列印流程，班級詞庫及跨裝置同步另行實作。

驗收包括舊版讀入兩次得到相同推薦、預覽不寫歷史、原生列印啟動與桌面 PDF 成功各記一筆、下載失敗不新增記錄、同課號但不同年級或學期不共用輸出提示，以及重設練習紙不清除家長確認進度。原生列印紀錄代表開啟列印流程，瀏覽器可能取消後續列印。回歸測試使用 `node --test tests/worksheet-progress.test.mjs`。

Chrome 以既有 113 康軒二上第八課驗證預覽、原生列印呼叫、PDF 下載與轉檔失敗，家長確認的第三課進度全程保留。iPhone 尺寸與使用者代理模擬通過原生列印呼叫，實機 iOS Safari 待驗。Chrome 自訂文字列印 PDF 的額外空白頁也能在基準版重現，版面問題由[既有列印工單](2026-02-03-stabilize-print.md)處理。
