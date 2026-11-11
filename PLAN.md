# 中文書寫練習開發計畫

> **最後更新**: 2026-11-11
> **Owner**: Gavin0099
> **Freshness**: Phase (30d)

## Current Phase

- [x] 完成 AI Governance 初始導入與本機驗證。
- 專案是一個讓家長與老師製作中文練習紙的靜態網站。既有工單保留在 `work/tickets/`。

## Active Sprint

- [x] 固定共用框架版本，套用框架 baseline 與專案規則。
- [x] 安裝 Git hooks，驗證治理設定、版本一致性及 runtime fixtures。
- [x] Owner 確認契約領域為中文書寫練習與列印教材生成，repo 風險分級為低風險。

## Decision Log

- 2026-11-11 採用 Git submodule 固定共用治理框架版本，既有專案事實沿用 `memory/` 中的文件。
- 2026-11-11 採用 owner 確認的低風險契約，依變更內容保留各工單的驗收要求。

## Known Risks

- 桌面 Chrome 與 iOS Safari 的列印結果須分別驗證，見 [列印工單](work/tickets/2026-02-03-stabilize-print.md)。
- 更新課綱字表、筆順與字型時，須依各來源核對授權和署名。

## Anti-Goals

- 本次導入範圍限於治理設定及其驗證。網站 UI、教材資料與部署流程屬各自的工單。
