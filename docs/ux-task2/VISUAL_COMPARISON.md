# UX 任務 2：前後對照與畫面缺口

日期：2026-11-12。before 圖由既有提交 `02349bd` 提供；本次未改動這些圖。已核對影像尺寸：mobile 首屏 390×844，desktop 首屏 1280×800。原檔沒有本次可核實的 OS、瀏覽器版號或量測 manifest，因此不能宣稱這些圖通過 Windows 驗收。

**after 實際截圖：尚未取得。** Chrome 啟動失敗，詳見 `TEST_NOTES.md`。下表右欄是已落地的 HTML／DOM 結構，不是實測畫面或尺寸保證。

| 狀態／問題 | 已提供的 before 畫面 | after 程式結構與待拍位置 |
| --- | --- | --- |
| 首次首頁 U1 | [390](shots/before/mobile-01-home-first-visit.png) · [1280](shots/before/desktop-01-home-first-visit.png) | 引導內先出現「老師詞庫與出卷」直達，接著才是年級／學期；新增關閉按鈕。待拍首屏與鍵盤焦點。 |
| 回訪首頁 U1／U2 | [390](shots/before/mobile-02-home-returning.png) · [1280](shots/before/desktop-02-home-returning.png) | 推薦卡之前有老師詞庫、用既有詞庫出卷兩個任務入口，以及資料與同步連結。待拍首次／已有練習紙設定兩種狀態。 |
| 空詞庫 U3／U6 | [390](shots/before/mobile-03-vocabulary-empty.png) · [1280](shots/before/desktop-03-vocabulary-empty.png) | 中性 intro → 本機來源（原 storage 成功返回本機後顯示）→「先建立班級詞庫」原表單。待拍無班級及剛建立 0 詞語。 |
| 已載入詞庫 U3／U4 | [390](shots/before/mobile-04-vocabulary-loaded.png) · [1280](shots/before/desktop-04-vocabulary-loaded.png) | 班級 → 新增／批次／出卷捷徑 → 出卷表單及已存考卷 → 兩種輸入 disclosure 與詞語清單。待拍首屏、批次展開、編輯展開及生成結果。 |
| 出卷位置 U4 | [390 長頁](shots/before/mobile-05-exam-entry-fullpage.png) · [1280 長頁](shots/before/desktop-05-exam-entry-fullpage.png) | `#examForm` 已在 `#wordForm`、`#batchForm`、`#wordList` 前；有／無班級的首頁出卷深連結各有焦點落點。待量測出卷 CTA bottom ≤844px，並拍深連結落點。 |
| 資料與同步 U6／U8 | [390](shots/before/mobile-06-sync-status.png) · [1280](shots/before/desktop-06-sync-status.png) | 原登入狀態 → 本機與家庭差異、直接本機詞庫／備份連結 → 原家庭資料區 → 管理者連線設定說明。待拍未設定、未登入、成功、失敗／衝突；不能把模擬畫面當真實同步驗收。 |

詞庫已載入的 before 圖可看到單筆課次、詞語、注音欄位直接排在班級卡後；改後的原始碼將此位置讓給任務捷徑與出卷。這能證明結構差異，不能證明改後的實際首屏座標。

補拍時沿用原合成 fixture，固定來源、viewport、scroll、縮放及 Chrome 版本；新圖保存於 `shots/after/`。另需拍 learning、backup、考卷與解答控制，以及 Tab 焦點與展開狀態。禁止把未經觀察的推論填成實測結果。
