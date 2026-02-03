# 中文書寫練習 - 多代理開發工作流

本專案採用「一個代理只做一種腦力工作」的原則，以降低 Token 消耗並提高產出質量。

## 目錄結構
- `/memory`: 長期不變的專案背景與規程。
- `/work/tickets`: 存放開發工單。
- `/work/outputs`: 存放各代理的階段性產出。

## 核心流程
1. **開票**: 在 `work/tickets/` 建立工單，明確 Goal、Non-goals 與 Acceptance Criteria。
2. **Context Loade**: 從 memory 提取最小必要資訊，生成 `work/outputs/context_pack.md` (限制 <= 1200 tokens)。
3. **Spec Agent**: 根據 pack 生成 `spec.md`。
4. **角色分工**: 各代理 (Code/UX/Data) 根據 context_pack + spec 完成各自工作。
5. **QA Agent**: 進行最後的風險評估與測試案例編寫。
6. **合併決策**: 人類 (Orchestrator) 審核並合併產出。

## 運作規範
- **嚴格節流**: 代理不得直接讀取整個 `/memory` 目錄，必須經由 `context_pack.md` 獲取上下文。
- **職責分離**: 嚴禁代理跨越其 [Agent Contracts](memory/09_agent_contracts.md) 定義的邊界。
- **提交規範**: 每次任務完成後，代理應主動執行 `git commit` 並記錄變更，以便版本溯源與使用者測試。
