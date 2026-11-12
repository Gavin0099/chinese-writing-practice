# Phase 2：before 與實作差異

**after 實際畫面尚未取得。** 以下是 harness 已提供的 before 截圖與可追溯的程式變更對照，不是已完成的視覺前後驗收。Chrome headless exit 134；原生 Chrome 工具拒絕存取。截圖的擷取 OS／瀏覽器狀態未獨立驗證，不稱作本次 Windows 驗收。

| 場景 | 已檢視的 before | Phase 2 實作與待補 after |
| --- | --- | --- |
| 手機首頁首次進站 | [390px 首訪](shots/before/mobile-01-home-first-visit.png)：畫面顯示筆順說明覆蓋層。 | `index.html` 的 onboarding 詞庫連結先於年級；提示有 Escape／焦點返回；新 `#homeVocabularyLink` 位於推薦卡前。需補「筆順提示開啟／關閉、onboarding、稍後設定」三種真實畫面。 |
| 手機已有詞庫 | [390px 已有詞庫](shots/before/mobile-04-vocabulary-loaded.png)：班級後先出現完整單筆表單。 | `#bookActions` 可直達出卷、單筆、批次；`#examForm`、`#examList` 在 `#batchForm`／`#wordForm` 前。需以同一 fixture 補 390×844 after、批次預覽及歷史重開畫面。 |
| 桌面已有詞庫 | [1280px 已有詞庫](shots/before/desktop-04-vocabulary-loaded.png)：輸入與詞語清單並列、出卷在其後。 | 出卷區先行；有歷史時 ≥52rem 出卷／歷史並列；下方維持新增／清單兩欄。需以同一 fixture 補 1280×800 after。 |

其他已存在的基準圖可供 harness 複驗：[無班級](shots/before/mobile-03b-vocabulary-empty-full.png)、[首頁回訪](shots/before/mobile-02-home-returning.png)、[同步狀態](shots/before/mobile-06b-sync-status-full.png)。本次未把這些檔案重新擷取或覆寫。

## 重現比較

1. 執行 `python3 scripts/preview.py`，在隔離瀏覽器設定檔進入 `http://127.0.0.1:8765/`。
2. 使用既有 `scripts/create-ux-review-fixtures.mjs` 的合成 fixture；不要新增教材、登入真實家庭或沿用私人 localStorage。只有具 Node 的環境才能執行該 fixture 腳本；本次未執行。
3. 同一 Chrome、OS、字型、fixture、viewport 與縮放，依序擷取首訪／回訪、無班級／空班級／已有詞語、批次預覽、已存考卷、同步未登入／可用狀態。
4. after 存在前，不可宣稱 390px 或 1280px 已無裁切、所有目標已量得 44×44、或已通過 Windows 視覺驗收。輸出檔維持 ignored artifacts，不改既有基準。
