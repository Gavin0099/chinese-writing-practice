# 教育部 SVG 筆順圖檔下載指引

## 📥 下載步驟

### 方法 1: 官方網站下載

1. **訪問教育部筆順學習網**
   ```
   https://stroke-order.learningweb.moe.edu.tw/
   ```

2. **進入教學資源**
   - 點擊頂部選單的「教學資源」
   - 或直接訪問: https://stroke-order.learningweb.moe.edu.tw/resource.jsp?ID=1

3. **下載筆順圖檔**
   - 找到「筆順圖檔下載」區塊
   - 下載 SVG 格式的圖檔包
   - 檔案名稱可能是: `stroke-order-svg.zip` 或類似

4. **解壓縮**
   - 解壓後應該會有 6,063 個 SVG 檔案
   - 檔案命名格式: `8349.svg` (Unicode 編碼)

### 方法 2: 直接連結 (如果有)

如果官網提供直接下載連結:
```
https://stroke-order.learningweb.moe.edu.tw/downloads/stroke-svg.zip
```

---

## 📋 下載後的步驟

### 1. 將 SVG 檔案放入專案

```
chinese-writing-practice/
├── stroke-svg/
│   ├── 8349.svg  ← 草
│   ├── 623F.svg  ← 房
│   └── ...
```

### 2. 驗證檔案

檢查「草」字的 SVG 是否存在:
```powershell
dir stroke-svg\8349.svg
```

### 3. 測試載入

在瀏覽器中測試:
```
file:///e:/BackUp/GridGen/chinese-writing-practice/stroke-svg/8349.svg
```

---

## ⚠️ 注意事項

1. **檔案大小**: 6,063 個 SVG 檔案可能有 50-100 MB
2. **Git 管理**: 考慮是否要提交到 Git (可能太大)
3. **授權**: 需標示「資料來源:教育部」

---

## 🔧 如果找不到下載連結

我可以協助:
1. 提供替代下載方式
2. 使用部分常用字的 SVG
3. 或改用其他方案

**請告訴我下載進度!**
