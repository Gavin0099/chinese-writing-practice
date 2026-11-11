# MOE 4808 Data Engineering Workspace

## 115 學年度國語課程資料

從[中研院大腦與語言實驗室](https://ball.ling.sinica.edu.tw/brain/edu/radical.html)下載 20260723 版 Excel，放到 `artifacts/runtime/curriculum-115/sinica-20260723.xlsx`。工作簿包含 115 上與 114 下，匯入時以每列的年度、學期欄位為準。

從專案根目錄執行：

```powershell
python -m pip install -r data_engineering/requirements-curriculum.txt
python -X utf8 data_engineering/import_curriculum.py artifacts/runtime/curriculum-115/sinica-20260723.xlsx --check-pedia
```

輸出預設位於 `artifacts/runtime/curriculum-115/`。`candidate-115-1.json` 以學年度、出版社、年級、學期及課次識別課程，保留習寫字、認讀字、工作表及來源列。未編號單元的課次是 `null`。`comparison-115-1.json` 列出兩邊缺少的課次、習寫或認讀分類差異及重複字。存在差異或來源無法讀取時，指令仍輸出報告，並以狀態碼 1 結束。

省略 `--check-pedia` 可在離線環境只匯入工作簿。加上該選項會重用輸出目錄中的 `pedia/` HTML 快照。使用新的 `--output-dir` 可重新抓取來源。Excel、候選 JSON、差異報告與快照供本機驗證，待確認兩個來源的再散布授權後再決定正式資料交付方式。[中研院使用條款](https://ball.ling.sinica.edu.tw/brain/terms_of_use.html) [教育百科版權聲明](https://pedia.cloud.edu.tw/Home/CopyRight)

### 20260723 版比對結果

115 上共有 18 個出版社與年級組合、200 個編號課次、2 個未編號單元、3,422 筆生字紀錄。以習寫及認讀類型逐字比對，194 組吻合、7 組有差異、1 組在教育百科找不到。康軒二上 12 課的字表均吻合，第八課有 18 個習寫字與 2 個認讀字。課次與年度來自教育百科，康軒教學文章另可核對第八課課名。[教育百科第八課](https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId=0103021150108) [康軒教學文章](https://e108in.knsh.com.tw/article01.asp?ID=80)

## 教育部 4808 常用字資料

## Status: BLOCKED (Missing Source Data)

We need the official **Ministry of Education (MOE) Standard Character List** to proceed. I cannot generate the 4808 dataset from "thin air" without violating the strict "No Guessing" rule.

## User Action Required

1.  Please download the **"常用國字標準字體筆順手冊"** or **"常用國字標準字體表"** data file.
    *   **Suggested Source**: [MOE Department of Lifelong Education](https://language.moe.gov.tw/) or [Government Open Data Platform](https://data.gov.tw/).
    *   **Target File**: A CSV or Excel file containing the 4808 characters, preferably with Zhuyin and Radical data.
2.  Rename the file to `source_4808.csv` (or `.xlsx`).
3.  Place it in this directory: `e:\BackUp\GridGen\chinese-writing-practice\data_engineering\`.

## ETL Pipeline (Planned)

Once the file is present, I will run the `etl_script.js` to:
1.  **Extract**: Read `source_4808.csv`.
2.  **Validate**: Check if count is exactly 4808.
3.  **Normalize**: Convert data to the strict schema.
4.  **Output**: Generate `char_core_4808.json` and others.

---
*Created by Data Authority Agent*
