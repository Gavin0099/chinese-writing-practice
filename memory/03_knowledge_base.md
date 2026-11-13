# Knowledge Base

## CANDIDATE / UNREVIEWED: 首頁直接下載練習簿裁切

- 原因是 html2canvas 使用過窄的副本視窗，捕捉到較窄的版面。jsPDF 再固定使用 210 mm 寬，將該影像放大到 442.62 mm 高，超出 A4 底部。
- 修正提交 `75d5ae7` 以 A4 寬度擷取副本，再按 PDF 頁面的兩個維度等比縮放。
- Windows Chrome 的自訂文字、康軒課綱、單頁及多頁回歸見 [PDF 裁切工單](../work/tickets/pdf-download-crop.md)。

## CANDIDATE / UNREVIEWED: Windows clone 安裝 Git hooks

- GitHub checkout 的 `origin` 可能省略 `.git`，安裝器會把尚未登記的 URL 加入受追蹤的 identity 檔。Windows 的 `core.autocrlf` 也會將該檔轉為 CRLF，安裝器比對原始位元組時會重寫。
- 修正提交 `ce62d759600c5c94a91feee22dda01d61eb1c48a` 登記兩種 HTTPS URL，並將該檔固定為 LF。
- Windows 乾淨 clone 使用兩種 URL 安裝 hooks 後，治理檢查通過且工作樹乾淨。對應的 canonical 紀錄見 [2026-11-11.md](2026-11-11.md)。
