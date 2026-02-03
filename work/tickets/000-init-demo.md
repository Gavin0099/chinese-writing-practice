# Ticket: 000-init-demo (架構初始化驗證)

## Goal
驗證多代理架構的 `Context Loader` 流程，確保能從 `memory/` 中提取正確資訊並生成符合 Token 限制的 `context_pack.md`。

## Non-goals
- 這次不撰寫任何實際的功能代碼 (Code Agent 任務)。
- 不進行 UI 設計 (UX Agent 任務)。

## Inputs
- 專案根目錄下的所有 `memory/*.md` 檔案。
- 目標模板：`memory/10_context_pack_template.md`。

## Deliverables
- `work/outputs/context_pack.md`

## Acceptance Criteria
- [ ] pack 內容包含專案 One-liner、工單目標、相關限制。
- [ ] pack 內容與 demo 任務高度相關，無多餘資訊。
- [ ] pack 長度符合 token 預算 (建議 800 tokens 內)。
