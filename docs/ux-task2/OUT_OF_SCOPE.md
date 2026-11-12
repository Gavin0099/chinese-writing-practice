# Phase 2：範圍申報

超出四個核心任務及驗收清單的產品變更：**none**。

沒有後端、資料結構、演算法、教材、字型、套件、部署或廣泛重構。新增鍵盤支援屬於本次明列的驗收範圍，但超出 Phase 1 預期檔案聯集，已在 DEVIATIONS.md 說明。

## 所有修改的 .mjs 檔案

| 檔案 | 理由與精確範圍 |
| --- | --- |
| `vocabulary.mjs` | 顯示已取得的本機／雲端模式；班級／單筆／批次／考卷成功文案說明保存位置；「已核對注音」文案與空題池引導；空班級提示及任務連結的 hidden 狀態；新增兩個只展開既有批次 details／移動焦點的導覽 listener。沒有改 persist、資料讀寫時機、dirty、beforeunload、欄位驗證、抽題、seed、歷史及 URL 生成。 |
| `sync.mjs` | 只把成功取得 session 後的既有未登入分支中的空白 notice 改為「尚未登入雲端。本機資料仍在這個瀏覽器…」。所有 Auth／同步條件、呼叫與錯誤分支保持原樣。 |

其他 `.mjs` 修改：**none**。`exam.mjs`、`backup.mjs`、`learning.mjs` 皆未修改。

`script.js`／`stroke-notice.js` 只補 overlay 與焦點操作；`script.js` 自 `function initApp()` 到檔尾（包含推薦、worksheet rendering、html2canvas、PDF、print 路徑）與起點逐 byte 相同。所有受保護檔案未改。

新增文件僅在 `docs/ux-task2/`：DEVIATIONS.md、OUT_OF_SCOPE.md、TEST_NOTES.md、COMPARISON.md、PR_DRAFT.md。測試暫存位於 ignored 的 `artifacts/runtime/ux-task2/`，不納入交付提交。未修改既有 docs、治理／memory／PLAN、scripts、tests 或 `.gitignore`。
