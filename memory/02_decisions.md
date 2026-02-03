# Design Decisions (Why we chose X) (設計決策)

## Decision Log
- [2026-02-03] 使用靜態部署（Pages）優先，降低維運成本
  - Why: 需求偏生成與列印，不需要後端狀態
- [2026-02-03] 字表採版本化管理
  - Why: 避免內容更新導致舊版列印不可重現

## Open Questions
- 筆順資料來源與授權風險
- PDF 輸出一致性（不同瀏覽器/裝置：iOS/Android/Chrome）
