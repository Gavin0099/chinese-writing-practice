# Agent Contracts (代理契約 - 單一職責原則)

## Context Loader (上下文加載器)
- **輸入**: ticket (工單) + 最小限度的 memory 參考
- **輸出**: `work/outputs/context_pack.md` (建議 <= 1200 tokens)
- **必須**: 包含目標 (Goal)、非目標 (Non-goals)、限制、相關決策 (最多 5 項)
- **嚴禁**: 自行發明新需求

## Spec Agent (規格代理)
- **輸入**: `context_pack.md` + ticket (工單)
- **輸出**: `work/outputs/spec.md`
- **必須**: 定義輸入/輸出、邊界案例、驗收標準 (Acceptance Criteria)
- **嚴禁**: 描述實作細節

## Data Agent (資料代理)
- **輸入**: `context_pack.md` + `spec.md`
- **輸出**: `work/outputs/datasets.md` 或 `sources.json` 說明
- **嚴禁**: UI 文案 / 版面配置決策

## UX Agent (體驗代理)
- **輸入**: `context_pack.md` + `spec.md`
- **輸出**: `work/outputs/ux_copy.md`
- **嚴禁**: 演算法 / 資料格式

## Code Agent (實作代理)
- **輸入**: `context_pack.md` + `spec.md` + `architecture.md` (僅在被引用時)
- **輸出**: `work/outputs/design.md` + `implementation_notes.md`
- **嚴禁**: 變更需求

## QA/Adversary Agent (測試/對抗代理)
- **輸入**: `spec.md` + `design.md` + `implementation_notes.md`
- **輸出**: `work/outputs/qa_testcases.md` + `risk.md`
- **必須**: 尋找反例、遺漏的案例
- **嚴禁**: 提議新功能
