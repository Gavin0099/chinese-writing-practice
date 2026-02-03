# Context Pack - Stabilize Print/PDF Layout (<=1200 tokens)

## Project One-liner
一個可生成中文練習紙（生字、空格、筆順等）的網頁工具，讓家長/老師快速產出可列印素材。

## Current Ticket: 2026-02-03-stabilize-print
- **Goal**: 讓練習紙在桌機 Chrome 與手機 Safari 列印時不跑版，且 PDF 輸出不出現多餘標題。
- **Non-goals**: 不新增新字表、不改 UI 主流程、不做登入/帳號。
- **Definition of Done**: Chrome/Safari 列印效果穩定，無多餘標題資訊。

## Relevant Decisions (max 5 bullets)
- [2026-02-03] 使用靜態部署（Pages）優先，降低維運成本。

## Constraints (From memory/01_constraints.md)
- Token budget: Context pack <= 800 tokens。
- 每次任務只能改動 1 個主題（在此為列印版面）。

## Quality Bar (From memory/07_quality_bar.md)
- **Must Have**: 列印版面穩定（不跑版、不裁切）、手機/桌機都能操作。

## Current Known Risks (From memory/02_decisions.md)
- PDF 輸出一致性（不同瀏覽器/裝置：iOS/Android/Chrome）。
