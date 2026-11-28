# 中文書寫練習 - 多代理開發工作流

本專案採用「一個代理只做一種腦力工作」的原則，以降低 Token 消耗並提高產出質量。

共用 AI Governance 框架由 Git submodule 固定版本。安裝與驗證步驟見 [AI Governance 導入指南](docs/GOVERNANCE_ONBOARDING.md)，專案規則見 [AGENTS.md](AGENTS.md)。

要在本機試用新版，可從 [UX／UI 審查入口](docs/UX_REVIEW.md) 產生合成資料並重現主要操作流程。

## 瀏覽器支援門檻（Owner 2026-11-27 核准）

Web Locks 支援門檻僅適用於本機模式；本機不加入未加鎖的 fallback。一般雲端模式即使缺少 Web Locks 仍可寫入，由伺服器 expected-revision 檢查拒絕過期寫入。是否支援仍以執行時 API 偵測決定。

| 環境 | 行為 |
| --- | --- |
| HTTPS + 支援 Web Locks 的瀏覽器 | 正常讀寫 |
| localhost / 127.0.0.1 | 正常讀寫（本機模式仍須 Web Locks；一般雲端寫入由伺服器 revision 檢查保護） |
| iOS Safari 15.4+ | 支援，仍由執行時 API 偵測決定 |
| iOS Safari ≤15.3 | 本機模式唯讀並顯示明確提示，保留備份下載；一般雲端模式仍可寫入，伺服器 revision 檢查拒絕過期寫入 |
| 區域網路 HTTP 或缺少 Web Locks | 本機模式唯讀並顯示明確提示；一般雲端模式仍可寫入，伺服器 revision 檢查拒絕過期寫入 |
| `file://` | 不支援／不作保證 |

無 Web Locks 時，本機模式仍可讀資料、開啟既有考卷及下載備份；本機寫入須顯示拒寫提示且原資料不變。一般雲端模式只透過既有 expected-revision RPC 寫入；版本衝突顯示提示，不回落到本機保存。

DB-04 離線同步預設關閉；頁面入口須明確啟用且 IndexedDB／Web Locks 均可用才啟動離線佇列。缺少能力時改走一般雲端路徑，連線寫入仍受 revision 檢查保護，但不提供離線暫存／重送。直接以 `requireLocks: true` 開啟離線儲存而缺少 Web Locks 時，會拒絕初始化。

更新後，已開啟的分頁必須重新載入；舊版分頁不使用這把鎖。

- [ ] **正式發布待辦，尚未完成**：部署前須處理舊版分頁繼續寫入的風險；僅補文件不能使部署切換安全。詳見 [EX-01 工單](work/tickets/ex-01-private-exam-save.md)。

## 目錄結構
- `/memory`: 長期不變的專案背景與規程。
- `/work/tickets`: 存放開發工單。
- `/work/outputs`: 存放各代理的階段性產出。

## 核心流程
1. **開票**: 在 `work/tickets/` 建立工單，明確 Goal、Non-goals 與 Acceptance Criteria。
2. **Context Loader**: 從 memory 提取最小必要資訊，生成 `work/outputs/context_pack.md` (限制 <= 800 tokens)。
3. **Spec Agent**: 根據 pack 生成 `spec.md`。
4. **角色分工**: 各代理 (Code/UX/Data) 根據 context_pack + spec 完成各自工作。
5. **QA Agent**: 進行最後的風險評估與測試案例編寫。
6. **合併決策**: 人類 (Orchestrator) 審核並合併產出。

## 運作規範
- **嚴格節流**: 代理不得直接讀取整個 `/memory` 目錄，必須經由 `context_pack.md` 獲取上下文。
- **職責分離**: 嚴禁代理跨越其 [Agent Contracts](memory/09_agent_contracts.md) 定義的邊界。
- **提交規範**: 每次任務完成後，代理應主動執行 `git commit` 並記錄變更，以便版本溯源與使用者測試。
