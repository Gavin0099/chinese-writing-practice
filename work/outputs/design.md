# Implementation Notes: Print & PDF Stability

## 變更項目
1. **清理編碼**: 將 `styles.css` 統一轉換為 UTF-8，解決舊有損壞字元問題。
2. **重構 @media print**:
    - 採用「嚴格隱藏」策略，隱藏所有非相關的網頁組件。
    - 鎖定 `#legacyControls > .col-lg-8` (預覽區) 為列印唯一可見容器。
3. **頁面校準**:
    - 設定 `@page { margin: 0; }` 以移除 Safari 的網頁標題。
    - 強制 `.sheet-page` 為 `210mm x 285mm`，防止瀏覽器預設邊距導致多餘分頁。
4. **手機相容性**: 在 `@media print` 內保留了與手機版修正 (`mobile-fix.css`) 協同運作的 `height: auto` 邏輯，但在 A4 模式下強制固定尺寸。

## 實作細節 (styles.css)
- 使用 `body > *:not(.hero-section)` 快速過濾頂層干擾。
- 針對 Safari 的 `-webkit-print-color-adjust: exact` 確保背景格線與文字顏色渲染。
