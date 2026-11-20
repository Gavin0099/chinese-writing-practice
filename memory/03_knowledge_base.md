# Knowledge Base

## CANDIDATE / UNREVIEWED: 國字查詢失去習寫紀錄入口

- 版本整合移除了國字查詢的逐字習寫狀態欄位與查閱入口。備份仍包含原資料，還原後卻無法在查詢頁讀取或編輯。
- 修正提交 `d2687b9` 恢復入口並沿用既有本機及雲端儲存。失敗時回復已儲存的狀態，雲端 409 仍可下載未同步備份。
- 合成 v1 備份在 Chrome 和 iPhone 尺寸 WebKit 驗證舊紀錄、編輯、重開與錯誤回復。54 項 Node 測試通過。對應的紀錄見 [2026-11-15.md](2026-11-15.md)。

## CANDIDATE / UNREVIEWED: 首頁直接下載練習簿裁切

- 原因是 html2canvas 使用過窄的副本視窗，捕捉到較窄的版面。jsPDF 再固定使用 210 mm 寬，將該影像放大到 442.62 mm 高，超出 A4 底部。
- 修正提交 `75d5ae7` 以 A4 寬度擷取副本，再按 PDF 頁面的兩個維度等比縮放。
- Windows Chrome 的自訂文字、康軒課綱、單頁及多頁回歸見 [PDF 裁切工單](../work/tickets/pdf-download-crop.md)。

## CANDIDATE / UNREVIEWED: Windows clone 安裝 Git hooks

- GitHub checkout 的 `origin` 可能省略 `.git`，安裝器會把尚未登記的 URL 加入受追蹤的 identity 檔。Windows 的 `core.autocrlf` 也會將該檔轉為 CRLF，安裝器比對原始位元組時會重寫。
- 修正提交 `ce62d759600c5c94a91feee22dda01d61eb1c48a` 登記兩種 HTTPS URL，並將該檔固定為 LF。
- Windows 乾淨 clone 使用兩種 URL 安裝 hooks 後，治理檢查通過且工作樹乾淨。對應的 canonical 紀錄見 [2026-11-11.md](2026-11-11.md)。
