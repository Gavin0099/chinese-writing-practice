# Ticket: stabilize print/pdf layout

## Goal
讓練習紙在桌機 Chrome 與手機 Safari 列印時不跑版，且 PDF 輸出不出現多餘標題。

## Non-goals
- 不新增新字表
- 不改 UI 主流程
- 不做登入/帳號

## Acceptance Criteria
- Chrome 列印預覽與實際 PDF 一致
- iOS Safari 輸出不出現意外標題（例如左上角字樣）

## V-03 交付前驗收

Windows Chrome 原生列印以自訂文字「晴天」產生單頁練習紙時，基準版 `2abce17` 和 F-00 版本都能重現 A4 PDF 開頭多出一張空白頁。V-03 正式交付前須修復這個問題，並從 Windows 實際列印考卷和解答。核對無空白頁、田字格與注音無裁切，考卷與解答題序一致。保留實際輸出供驗收。

2026-11-11 修正列印時的預覽容器分頁。Windows Chrome 自訂「晴天」原生輸出 1 頁 A4，既有康軒第八課原生輸出 4 頁 A4，桌面 PDF 下載和失敗時的歷史隔離均通過。V-03 的考卷與解答以 Microsoft Print to PDF 完成 Windows 列印工作 3，輸出 2 頁 A4，已渲染核對。實體印表機及 iPhone Safari 待驗。
