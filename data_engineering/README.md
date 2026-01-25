# MOE 4808 Data Engineering Workspace

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
