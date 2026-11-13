# 版本穩定與交付

私人站部署版本以本機封存清單追溯。當時由 Wrangler 上傳，部署紀錄沒有 Git commit 註記。整合分支首個提交是事後重建的應用程式來源。實際部署的雲端設定由環境另外提供。

## 從乾淨工作目錄驗證

1. 使用 Node.js 22 或以上執行 `node --test tests/*.test.mjs`。
2. 執行 `python scripts/preview.py`，在同一個 loopback origin 開啟 `/index.html?local=1`。首頁、自訂練習、詞庫、考卷、錯題複習和國字查詢皆可在本機使用。
3. 雲端環境依 `supabase/migrations/` 的時間順序建立資料庫。在獨立測試資料庫執行 `psql -v ON_ERROR_STOP=1 -f scripts/test-family-sync.sql` 和 `psql -v ON_ERROR_STOP=1 -f scripts/test-review-sync.sql`。兩個腳本使用合成帳號並在交易結束時回滾。使用 Supabase CLI 2.84.2 建立本機環境時，需在暫存設定將 `[local_smtp]` 改為 `[inbucket]` 才能通過 CLI 的設定解析。
4. 需要驗證 Google 登入及 OCR 時，由授權操作者提供開發環境的瀏覽器 publishable 設定、Google callback 及照片匯入開關，並依下節準備模型。專案原始碼的預設設定保留本機模式。雲端測試使用獨立測試帳號與合成樣本。

## 重建裝置端 OCR 資產

從 [RapidOCR v3.10.0](https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/onnx/PP-OCRv5/rec/ch_PP-OCRv5_rec_mobile.onnx) 下載模型。組裝腳本會驗證 SHA-256 `5825fc7ebf84ae7a412be049820b4d86d77620f204a041697b0494669b1742c5`。

```powershell
python -m pip install onnxruntime==1.31.1
npm install --prefix <dependency-directory> --save-exact onnxruntime-web@1.22.0
python scripts/prepare-photo-ocr-assets.py <model.onnx> <dependency-directory>/node_modules/onnxruntime-web photo-ocr-assets
```

把 [ONNX Runtime MIT License](https://raw.githubusercontent.com/microsoft/onnxruntime/v1.22.0/LICENSE) 與 [PaddleOCR Apache-2.0 License](https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/LICENSE) 放到資產目錄，名稱為 `onnxruntime-license.txt` 和 `paddleocr-license.txt`。模型、字表和 WASM 由測試環境組裝。輸出雜湊如下。

| 檔案 | SHA-256 |
| --- | --- |
| `onnxruntime-license.txt` | `2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c` |
| `paddleocr-license.txt` | `3840c5c0c61c294264d2dd77b8777be6ddd90121ef4e0e64abcd22edea581d6e` |

## 交付界線

整合 Draft PR 供審查。PDF 裁切修正另走獨立分支。私人試用的驗收證據包含本機與雲端功能回歸，iPhone Safari 備份還原及實體紙本須另記實機結果。公開發布另需教材公開授權、公開環境設定、家庭資料隱私檢核及回滾方案。

目前私人站暫停在國字查詢顯示及編輯單字習寫狀態。原有資料仍可備份和還原。合併前由 Owner 確認是否恢復查詢入口，以完成原 F-04 的使用流程。
