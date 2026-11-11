# F-02 國字逐字查詢核心

`lookupCharacters(text, options)` 接受合成或已核實的教材和已確認進度。實作範圍包含查詢和狀態判定，介面由 F-03、進度輸入由 F-01、紀錄寫入由 F-04 負責。OCR 可以把校正後的文字送入同一函式。

- `curricula` 包含孩子各期實際使用的教材。每期鍵值包含 `academicYear`、`publisher`、`grade`、數字 `semester` 和 `sourceVersion`。`expectedLessons` 由課程目錄提供，`lessons` 包含 `number`、`status`、`source`、課名和 `characters`。僅完整且唯一的 `verified` 課次可提供證據，字種為 `writing` 或 `recognition`。有未確認的未編號單元或教材缺漏時，將該期的 `coverageComplete` 保持為 `false`。
- `progress` 包含每期家長確認的課次。教材鍵必須完全相同，且明確 `confirmed: true`；`lesson: 0` 表示家長確認尚未開始。缺少版本、不同出版社或衝突的確認紀錄都不能代用。`historyComplete: true` 只用於已查證孩子教材沿革的範圍。
- 每個國字回傳所有原文 UTF-16 位置、最早可查到的已驗證課次與其來源、後續出現、教學狀態與習寫狀態。已確認的教學範圍內找到證據可顯示推估已教。判定尚未教到需要完整教材歷史、連續學期、完整課次與各期已確認進度。其餘顯示資料不足。`writingStatuses` 由 F-04 供應，缺值顯示尚未評估。

回歸案例涵蓋重複字與擴展漢字位置、教材同課不同版、舊列印欄位不能當進度、未確認或缺課時保留資料不足、同學期版本衝突、跨學期順序及孩子習寫狀態獨立。使用 `node --test tests/character-lookup.test.mjs` 驗收。
