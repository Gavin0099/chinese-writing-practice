# Phase 2：方案偏離與理由

日期：2026-11-12。起點 `0c61648b8d6b4efce0d9007473dbc56d1e717b61`；本次修改的 12 個產品檔在該起點與 `901cb8d` 逐 byte 相同。未修改 Phase 1 的 ISSUES.md 或 PLAN.md。

1. **補首頁鍵盤操作（驗收範圍內）。** 除計畫列出的檔案，修改 `script.js`、`stroke-notice.js`：既有 onboarding、筆順提示及 LINE 提示補上 Escape 關閉、開啟／返回焦點、Tab 邊界及 dialog 語意；隱藏筆順提示使用 inert，避免不可見按鈕進入 Tab 順序。首頁原有六個年級 div 改成同 class、同 data-value 的原生 button，沿用 click 處理。這是「主要操作可用鍵盤、overlay 可關閉」的必要補充。筆順內容、首次提示判定／3 秒時機／storage key、推薦、產生與列印函式未改。
2. **首次設定可稍後完成。** 新增「稍後設定練習紙」及對應 Escape 動作，關閉後以既有預設呼叫原 `initApp()`，焦點到老師詞庫入口；不儲存設定、不改 `isNewUser()` 或預設值。原「開始練習」的設定寫入保持原樣。這是可退出 overlay 的呈現路徑，不是新的持久化狀態。
3. **桌面出卷／歷史並列。** `vocabulary.html` 加一層 `.exam-workspace`，有歷史紀錄且 ≥52rem 時並列；手機仍按 DOM 順讀。所有原有節點、form ownership、name、id 及動態 URL 保留。無班級引導與空詞庫下一步仍位於出卷前。
4. **before 可讀，after 無法產生。** Phase 2 起點已含 harness 提供的 before 圖，本次檢視其中三張；Phase 1 文件的「沒有截圖」描述不代表本階段起點。Chrome headless exit 134，原生 Chrome 工具拒絕存取，沒有產生 after。以 `COMPARISON.md` 記錄現有 before 與實作差異，明標 after 未觀察；未以線框冒充截圖。
5. **驗收受環境限制。** 沒有 Node，不安裝依賴／build；29 項測試未執行。以靜態表單、DOM、媒體邊界及逐 byte 比對提供有限證據，不宣稱替代視覺、鍵盤、雲端或列印驗收。詳見 TEST_NOTES.md。
6. **Draft PR 交付程序。** 不執行 commit、push、branch、checkout。已備妥 PR_DRAFT.md；本次沒有建立遠端 Draft PR，等待 harness 提交及上傳後處理，沒有建立空 PR。
7. **Skill 移除遭沙箱阻擋。** 確認 `.agents/skills/impeccable` 沒有 tracked 檔案後，依指示執行刪除，得到 `PermissionError(1, 'Operation not permitted')`。環境把 `.agents` 設為唯讀；沒有繞過限制、改權限或改 `.gitignore`。資料夾仍在，需 harness 清除；不能宣稱滿足移除要求。

實作方案重做次數：**0**。一次來源覆核後的小幅 polish（取消不必要的 content-visibility 覆寫、補 viewport 高度 fallback／原生年級按鈕），未推翻任務排序或重新設計。

## Impeccable 使用方式

已讀 `.agents/skills/impeccable/SKILL.md` 及以下參考。只套用使用者指定的八項方法；沒有執行任何 launcher CLI，沒有 live、init、document、context、detect 或 critique-storage，沒有 PRODUCT.md／DESIGN.md。來源 commit 使用使用者提供的 `b4bff1626c344067788c2679f048a20057c7cc5a`；未做遠端版本驗證。

| 指令／reference | 對實作的實際影響 |
| --- | --- |
| critique — `reference/critique.md` | 沿用 Phase 1 的 U1–U8 critique；檢查既有 before 與原始碼，從首訪、回訪及鍵盤使用者角度核對優先順序。保留已有出卷捷徑、批次錯誤保留及核對流程。本階段沒有另跑完整雙代理／detector critique，沒有評分或新快照。 |
| onboard — `reference/onboard.md` | 首次設定先提供詞庫入口；無班級與空班級給明確下一步，提供稍後設定，不增加帳號門檻、tour、範例教材或儲存 key。 |
| distill — `reference/distill.md` | 出卷與歷史移到表單前；批次入口移到單筆前；固定種子收在原生 details；精簡導覽文字。功能與驗證都保留。 |
| clarify — `reference/clarify.md` | 分清本機／家庭雲端、預覽／儲存、已核對／可抽題、產生／開啟；說明本機還原取代範圍。成功文案只在原成功分支顯示。 |
| layout — `reference/layout.md` | DOM 與視覺順序一致；班級旁集中三個任務入口，桌面出卷／歷史可並列，手機維持順讀。 |
| typeset — `reference/typeset.md` | 沿用既有字族與配色；操作說明及 metadata 用 1rem，建立頁標題／區標題／單筆標題層級；不改字型資產或印刷繼承。 |
| polish — `reference/polish.md` | 覆核整條流程的動作名稱、空態、focus、隱藏 overlay、seed form ownership 與差異邊界；未把來源檢查當成渲染驗收。 |
| adapt — `reference/adapt.md` | 操作目標設 44px 下限、導覽可折行、窄螢幕單欄／小尺寸出卷兩欄、overlay 可捲動，保留 viewport 高度 fallback。Windows／iPhone 的證據分開列明。 |

另在 UI 編輯前讀取 `reference/craft-floor.md`（品質參考，不是額外指令）：保留可讀對比與明確焦點，避免新增裝飾或無任務價值的卡片。未使用其他指令。

Questions skipped: 本次是已授權方案的 Phase 2 實作，四項任務、範圍與優先順序均已由使用者固定；未重啟 Phase 1 critique 的選題流程。
