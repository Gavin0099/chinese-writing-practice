# UX 任務 2：計畫偏差

日期：2026-11-12。依據既有 `PLAN.md`，不覆寫 Phase 1 文件。

1. **增加 `script.js`、`stroke-notice.js` 的呈現接線。** 原方案預期不改這兩檔，但最終驗收明確要求 overlay 可用鍵盤關閉。原 onboarding 沒有關閉／Escape，筆順提示隱藏時仍可能被 Tab 聚焦。加入可見的「稍後設定，先看首頁」、Escape、焦點進出與可退出的對話框 Tab 循環；三種既有 overlay 共用短小的鍵盤 helper。跳過引導只呼叫原 `initApp()`，不寫入新的設定、不更改 `isNewUser()` 或任何儲存 key。原有引導完成的儲存路徑及筆順提示排程不變。
2. **首頁年級 selector 改用原生 button。** 六個原 `div.grade-card` 的 class、data-value、文字及 click handler 保留，補上 Tab／Enter／Space 可操作性。屬鍵盤驗收；不是新的選課或資料邏輯。
3. **桌面也保留同一個「其他工具」disclosure。** 計畫允許桌面展現更多連結，但不是必須。採單一原生 disclosure 避免複製 href 與雲端改寫入口；展開在正常文件流，不新增浮動選單。同步頁明標「本機詞庫」，避免把本機導覽誤認為雲端入口。
4. **瀏覽器實測與新 after 畫面未完成。** CLI 啟動 Chrome 兩次均 exit 134；瀏覽器控制回報 `The browser access host is unavailable`；透過既有 JS 工具執行同一 Chrome 亦為 SIGABRT。未安裝替代依賴。保留 `02349bd` 提供的 before 圖，另寫 `VISUAL_COMPARISON.md` 的結構對照，沒有以推論或 mockup 充當實測畫面。實際 390／1280 尺寸、鍵盤與列印須由可用瀏覽器補驗。
5. **Draft PR 內容準備在本機，未建立遠端 PR。** 實驗要求由 harness 提交且禁止本代理 commit／push；本機改動尚未成為可供 PR 審查的遠端提交。提供 `DRAFT_PR.md` 給 harness 提交後使用，不以指向舊版本的空 PR 宣稱已交付。

實作方案重做：**0 次**；仍採原方案的單頁詞庫、原生 disclosure、出卷提前及 screen CSS。瀏覽器驗證重試／改道：**3 次**（CLI 參數重試、切換瀏覽器控制、由 JS 工具啟動同一 Chrome）。另檢查了既有 Playwright 是否可載入，未成功、未安裝套件。
