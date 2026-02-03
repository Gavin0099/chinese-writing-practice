# Architecture Overview (架構概述)

## Modules
- Input: 字表選擇 / 自訂文字 / 級別
- Layout: 練習格樣式、大小、行距
- Render: HTML -> Print / PDF
- Assets: 筆順圖、字型、字表資料

## Key Interfaces
- generateWorksheet(input) -> renderModel
- renderToHTML(renderModel) -> DOM
- exportPDF(DOM) -> pdf
