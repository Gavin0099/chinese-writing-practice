# Spec: Stable Print & PDF Layout

## 1. 概述
本規格旨在修作「生字練習簿小幫手」在不同瀏覽器（尤其是 Chrome 與 iOS Safari）中的列印與 PDF 輸出表現，確保版面一致且無多餘標題資訊。

## 2. 輸入與輸出
- **輸入**: HTML 練習簿區域 (`#sheets-container`)。
- **輸出**: A4 尺寸、210mm x 297mm 的列印預覽或 PDF 檔案。

## 3. 核心需求與規格

### A. 列印隔離 (Print Isolation)
- **規格**: 進入列印模式時，必須隱藏所有非練習簿內容。
- **目標元素**:
    - `.minimal-header`, `.hero-section` (內含的 Smart Card), `.secondary-actions`, `.data-attribution`, `.stroke-modal-overlay` 必須完全消失。
    - 僅保留 `#legacyControls` 中的 `#sheets-container`。

### B. 頁面邊距與裝飾 (Page Setup & Safari Fix)
- **規格**: 使用 `@page` 規則強制 A4 尺寸並將邊距設為 0，以移除瀏覽器預設的頁首（標題）與頁尾（URL/日期）。
- **Safari 補強**: 針對 iOS Safari，確保 `body` 與 `html` 的 `overflow` 與 `height` 屬性能讓列印分頁正常工作。

### C. 版面尺寸校準
- **規格**: `.sheet-page` 必須嚴格鎖定在 `210mm x 285mm` (略小於 A4 高度以防最後一頁溢出)，並使用 `padding: 10mm`。

## 4. 邊際案例 (Edge Cases)
- **多頁列印**: 確保每頁練習紙 (`.sheet-page`) 之間有正確的分頁符號 (`page-break-after: always`)。
- **空內容**: 若無生成的練習紙，則不應顯示任何列印內容。

## 5. 驗收標準 (Acceptance Criteria)
- [ ] Chrome 桌機版：列印預覽不顯示網頁導覽列與背景裝飾。
- [ ] iOS Safari: 導出的 PDF 頂部不出現網頁標題 (`生字練習簿產生器`)。
- [ ] 跨平台：第一頁與後續頁面邊距保持一致。
