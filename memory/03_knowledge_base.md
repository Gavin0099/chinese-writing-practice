# Knowledge Base

## CANDIDATE / UNREVIEWED: Windows clone 安裝 Git hooks

- GitHub checkout 的 `origin` 可能省略 `.git`，安裝器會把尚未登記的 URL 加入受追蹤的 identity 檔。Windows 的 `core.autocrlf` 也會將該檔轉為 CRLF，安裝器比對原始位元組時會重寫。
- 修正提交 `ce62d759600c5c94a91feee22dda01d61eb1c48a` 登記兩種 HTTPS URL，並將該檔固定為 LF。
- Windows 乾淨 clone 使用兩種 URL 安裝 hooks 後，治理檢查通過且工作樹乾淨。對應的 canonical 紀錄見 [2026-11-11.md](2026-11-11.md)。
