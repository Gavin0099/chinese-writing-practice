# 生字練習簿產生器

一個簡單易用的 Web 應用程式,用於產生帶有筆畫順序的中文生字練習簿 PDF。

## 功能特色

✨ **筆畫順序顯示** - 使用 HanziWriter.js 顯示正確的筆畫順序  
📝 **田字格設計** - 標準中文書寫田字格  
🎨 **即時預覽** - 輸入後立即看到練習簿版面  
📄 **PDF 匯出** - 可下載列印的 PDF 檔案  
⚙️ **彈性設定** - 可調整每列字數和練習列數  

## 使用方式

1. 在「請輸入要練習的生字」欄位輸入想要練習的中文字
2. 調整「每列字數」和「練習列數」(可選)
3. 點擊「產生練習簿」按鈕
4. 預覽產生的練習簿
5. 點擊「下載 PDF」儲存檔案並列印

## 技術架構

- **HTML5** - 頁面結構
- **CSS3** - 樣式設計(包含田字格)
- **JavaScript** - 互動邏輯
- **HanziWriter.js** - 筆畫順序資料與渲染
- **jsPDF** - PDF 產生
- **html2canvas** - HTML 轉圖片

## 本地執行

直接在瀏覽器中開啟 `index.html` 即可使用,無需安裝任何套件。

## 瀏覽器支援

- Chrome / Edge (推薦)
- Firefox
- Safari

## 授權

本專案使用的筆畫順序資料來自 [HanziWriter](https://hanziwriter.org/),基於 [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) 專案。
