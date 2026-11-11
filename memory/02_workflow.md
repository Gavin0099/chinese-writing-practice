# 開發流程與專案事實

## 專案事實

- 網站入口是 `index.html`，由 HTML、CSS 與瀏覽器 JavaScript 產生中文練習紙。專案使用 Cloudflare Pages 靜態部署。
- `data_engineering/` 存放教材來源與資料處理工具，瀏覽器入口載入已生成的資料檔。
- [專案簡介](00_project_brief.md)、[限制](01_constraints.md)、[架構](04_architecture.md)及[品質標準](07_quality_bar.md)維持原有文件入口。

## 導入後的工作方式

- 工單與階段產出繼續放在 `work/tickets/` 與 `work/outputs/`。依 `AGENTS.md` 按需取得上下文。
- 框架由 Git submodule 固定版本。新 clone 安裝及驗證見 [AI Governance 導入指南](../docs/GOVERNANCE_ONBOARDING.md)。
