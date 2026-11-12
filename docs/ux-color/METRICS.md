# Harness metrics (base / A / B)

Measured on the box with one identical script for all three (Linux Chromium, playwright-core, 390x844 and 1280x800; scripts are described below, not committed).

| 指標（同一支腳本量測） | Base c36b407 | A（無 skill） | B（+ UI UX Pro Max） |
|---|---|---|---|
| 不同顏色總數（六頁、390＋1280、含展開 details；計算後顏色） | 55 | 27 | 27 |
| 　其中有彩度的顏色／中性色 | 27／28 | 15／12 | 10／17 |
| 　每頁不同顏色：首頁／學習／詞庫／考卷／備份／同步 | 46／7／9／10／5／7 | 21／7／8／12／6／6 | 21／7／8／11／5／7 |
| 色相家族數（30° 一組，有彩度顏色）總計 | 7 | 4 | 3 |
| 自寫 CSS 的 `var(--…)` 用量／原始色碼字面值（顏色屬性） | 97／200 | 263／219 | 272／210 |
| 　token 使用率 var／(var＋字面值) | 32.7% | 54.6% | 56.4% |
| 共用同一組主色的頁數（六頁中，各頁最常見的中調有彩度顏色相同者） | 4／6 | 5／6 | 5／6 |
| 首頁與其他頁的顏色集合 Jaccard 重疊（平均） | 0.127 | 0.398 | 0.415 |
| 首頁與詞庫頁 `:root` 同名且同值的 token 數 | 0 | 21 | 19 |
| 390px 文字 AA 不及格元素數（九個頁面狀態合計；總文字元素 597） | 27 | 2 | 2 |
| 390px 　不及格的不同前景／背景組合 | 12 | 1 | 1 |
| 390px 表單欄位邊界／底色對比 <3:1（共 40 個） | 40 | 0 | 0 |
| 390px 按鈕外框／底色對鄰近背景 <3:1（僅參考；共 86） | 56 | 14 | 14 |
| 390px 鍵盤焦點環不可見或對比 <3:1 的控制項（Tab 走查） | 2 | 2 | 3 |
| 1280px 文字 AA 不及格元素數（九個頁面狀態合計；總文字元素 597） | 27 | 2 | 2 |
| 1280px 　不及格的不同前景／背景組合 | 12 | 1 | 1 |
| 1280px 表單欄位邊界／底色對比 <3:1（共 40 個） | 40 | 0 | 0 |
| 1280px 按鈕外框／底色對鄰近背景 <3:1（僅參考；共 86） | 56 | 14 | 14 |
| 1280px 鍵盤焦點環不可見或對比 <3:1 的控制項（Tab 走查） | 2 | 2 | 3 |
| impeccable detect：首頁／六頁合計 | 10／10 | 4／9 | 4／9 |
| 　明細 | {'low-contrast': 7, 'flat-type-hierarchy': 1, 'skipped-heading': 1, 'nested-cards': 1} | {'flat-type-hierarchy': 1, 'skipped-heading': 1, 'cream-palette': 6, 'nested-cards': 1} | {'flat-type-hierarchy': 1, 'skipped-heading': 1, 'cream-palette': 6, 'nested-cards': 1} |
| 29 個自動測試 | 29 pass／0 fail | 29 pass／0 fail | 29 pass／0 fail |
| 考卷三種模式＋練習簿列印 vs base 不同像素 | — | 0（反向測試 48,490） | 0（反向測試 48,490） |
| 版面 bbox 比對（9 種頁面狀態×390/1280，共 2,772 筆元素比對）移動 >1px | — | 0 個（最大差 0.00px） | 0 個（最大差 0.00px） |
| 受保護檔案／JS 變更 | — | 無／無 | 無／無 |

## Method
- Layout: every element in <body> (+html/body) of 9 page states x 2 widths; bounding box (x,y,w,h incl. scroll offset); animations/transitions disabled; base vs base re-run = 0 differences. Tolerance 1px.
- Colors: computed color, background-color, border colors (width>0), outline, box-shadow, gradient stops, SVG fill/stroke for every visible element, with all <details> opened.
- Contrast: WCAG 2.x relative luminance; text 4.5:1 (3:1 if >=24px or >=18.66px bold); form fields boundary/fill vs surrounding background 3:1; focus ring: real keyboard Tab walk, outline >=2px (UA default auto ring counts as visible) or shadow/border/background change with >=3:1 against the surrounding background.
- Print: page.pdf in print media, pdftoppm -r 100, pixel diff vs base; negative control answers-vs-questions = 48,490 differing pixels.
- NOT MEASURED: Windows Chrome, iPhone Safari, physical print, colour-blind simulation, background-image contrast.
