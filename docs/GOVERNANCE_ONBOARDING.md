# AI Governance 導入指南

本 repo 透過 `ai-governance-framework/` Git submodule 使用共用治理框架。`governance/framework.lock.json` 記錄固定的版本與 commit。`AGENTS.md` 補充本專案的列印、瀏覽器儲存和教材資料驗收方式。

目前 `contract.yaml` 使用專案名稱作為初始領域識別，領域與 repo 風險分級待 owner 確認。

## 安裝與驗證

準備 Git 和 Python 3.12 以上版本。Windows 使用 Git for Windows，在 repo 根目錄執行以下 PowerShell 指令。

```powershell
git -c core.longpaths=true submodule update --init --recursive
python -m pip install -r requirements-governance.txt
Push-Location ai-governance-framework
try {
    python -X utf8 -m governance_tools.hook_installer --repo .. --framework-root . --hooks-only
} finally {
    Pop-Location
}
python -X utf8 scripts/check_governance.py
```

每個 clone 都需安裝自己的 Git hooks。GitHub Actions 使用相同的檢查入口，檢查 framework lock、契約、漂移、hooks、readiness、memory guard 與三個 Codex runtime 測試事件。

## 日常使用

- 工單與階段產出仍使用 `work/tickets/`、`work/outputs/`。接手工作時從 [PLAN.md](../PLAN.md) 與 [AGENTS.md](../AGENTS.md) 開始，依工單讀取相關專案知識。
- 產品驗收依各工單進行。列印變更的 Chrome 與 iOS Safari 驗收見[既有列印工單](../work/tickets/2026-02-03-stabilize-print.md)。
- 更新治理框架時，從 [框架更新協議](../governance/AI_GOVERNANCE_UPDATE_PROTOCOL.md) 進入 F-7 流程。
