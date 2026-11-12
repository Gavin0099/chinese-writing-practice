# A/B 截圖（harness 產生）
- `compare/`：Base 901cb8d｜A（無 skill）｜B（Impeccable）並排。mobile=390x844、desktop=1280x800。
- 以本分支（A 或 B）自己的資料夾為該組單張截圖。
- `metrics.md`：同一組量測腳本對 base/A/B 的指標表。
- 截圖用 Playwright + headless Chrome，從 `python3 scripts/preview.py` 與 `node scripts/create-ux-review-fixtures.mjs` 的合成資料產生。
