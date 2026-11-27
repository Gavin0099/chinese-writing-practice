# EX-01 私人保存考卷

Owner 授權：C334-S2/S3 Work Item 3；分支 `feat/c334-wi3-ex01-private-exam`，基準 `27343bb3`。本工單先定義規格，再以固定期望測試實作；不包含部署、資料庫變更或提交。

## 已存在與本次增量

- V-03 的 `vocabulary.mjs` 在「產生考卷」時已將 `makeExam` 的完整快照寫入 `vocabulary.exams`，不是只有種子。班級內已有反向排列的考卷紀錄、時間／課次／題數／種子、非預設題型標示與開啟連結；清單本已獨立於出卷表單，刪光詞條或切工作區後仍可開原卷。`exam.mjs` 按 ID 讀快照，支援考卷／解答；修改原詞條不會重抽原卷。AUTH-07 已記錄原卷重開的歷史驗收，不當作本次新功能。
- `write_practice_vocabulary_v1` 保存 `{ books, words, exams }`；備份 v1 已含考卷，`backupData.mjs` 驗證、下載、還原及失敗回復均已存在。雲端 `openFamilyStorage` 透過既有 `read_family_backup`／`save_family_backup` 與家庭 revision 保存整份備份；既有 SQL 交易支援考卷集合替換，RLS 依家庭隔離。
- DB-04 已有 IndexedDB 快取、離線佇列、重送與衝突草稿，預設關閉；V-06 只從所選詞條與教材白名單欄位建立分享檔，沒有考卷匯出。
- **本次增加**：明示「產生即私人保存」及保存位置；清單改稱「私人考卷」，增加空狀態、份數、逐份確認刪除與就地失敗提示。保留既有清單資訊、跨工作區及無詞條時可重開的行為。沿用既有產生即保存，不新增第二個保存按鈕或資料副本。

## 使用行為與資料契約

1. 選定班級後，產生有效考卷即保存快照並開啟私人清單；儲存失敗不得宣稱成功或增加清單。空白瀏覽器可先建立班級／詞語；空清單明示尚無保存考卷。
2. 清單僅列目前班級，沿用保存順序的新到舊；切班、頁面重新載入及重開原卷均使用同一資料來源。刪除全部原詞條後仍可開啟快照，不重新抽題。
3. 刪除按鈕須有可辨識的名稱，確認框含課次、題數及種子，說明不刪詞庫／既有錯題紀錄。取消不寫入；確認只移除指定班級的該份快照，其他考卷、詞庫、孩子紀錄不變。成功後清單與持久資料一致；失敗保留畫面及原資料，可重試。已刪除的 ID 重開顯示既有找不到考卷提示。
4. 不新增欄位或 key：exam 沿用 `id, createdAt, book` 當時班級快照、`from, to, count, seed, questions`，及既有選填 `examType`；questions 沿用 `word, pronunciation, blanks, sources` 及選填 `target`。不加入照片、分享旗標、擁有者或新考卷型別。預設私人是既有本機／家庭存取界線，並非加密或跨家庭分享機制。

## 隱私、備份與同步

- 本機只存在此瀏覽器；雲端模式只沿用目前帳號家庭的 storage。清單或開啟考卷不觸發下載或分享。V-06 的 JSON 必須排除整份考卷、ID、種子、題序與答案快照，即使同一詞庫有考卷也只輸出選取詞條及教材欄位。
- 本次不新增考卷專用匯出或分享。保留 Owner 明確要求的既有完整備份與手動列印／PDF：使用者明確下載備份時仍含私人考卷，應自行保管；這與 V-06 詞庫交換不同，不自動下載。刪除不會撤回既有下載檔或已開啟的頁面；還原刪除前備份可恢復原卷。
- 備份仍為 `chinese-writing-practice-backup` version 1，結構完全不變。舊 v1（沒有 `examType`／`target`）仍能還原；保存前後及刪除後 round-trip 保留期望集合與快照。既有空資料還原及失敗回復規則不變。
- 雲端新增／刪除都只走 `persist` → `setItem(vocabularyStorageKey, ...)` → 既有家庭備份 RPC，不直接碰表。revision 衝突不報成功，沿用下載未同步備份與重新載入；不做自動合併。
- 離線功能未啟用時不承諾離線雲端保存。明確啟用且支援 IndexedDB／Web Locks 時，沿用既有佇列，新增／刪除結果顯示「已暫存於本機，待連線後同步」；重開能讀待同步集合，重連後依既有 FIFO／revision 同步，衝突沿用既有人工處置。登出／切帳號沿用原 session guard，不回落到別的家庭或本機資料。
- F1 返修：本機詞庫的所有寫入（班級／詞語編輯、批次／分享／照片匯入、一般與錯詞複習出卷、刪除及備份還原）共用以 `write_practice_vocabulary_v1` 命名的 origin exclusive Web Lock；修改前在鎖內重讀，還原的預覽比對與失敗回復也在鎖內。本機模式不支援 Web Locks 時拒寫並提示改用支援瀏覽器及 HTTPS／localhost，仍可讀取原資料；一般雲端寫入沿用伺服器 expected-revision 檢查，不受此唯讀門檻限制。未改 key 或資料／備份格式。鎖只協調同 origin 且已更新的程式；舊版分頁須先重載，不能據此保證未參與鎖的舊版或手動 storage 寫入。

## WI-3 F3：Owner 核准的支援門檻（2026-11-27）

Owner 決策（2026-11-27 follow-up）：Web Locks 支援門檻僅適用於本機模式；本機不加入未加鎖的 fallback。一般雲端模式即使缺少 Web Locks 仍可寫入，由伺服器 expected-revision 檢查拒絕過期寫入。是否支援仍以執行時 API 偵測決定，不只判斷瀏覽器版本。

| 環境 | 行為 |
| --- | --- |
| HTTPS + 支援 Web Locks 的瀏覽器 | 正常讀寫 |
| localhost / 127.0.0.1 | 正常讀寫（本機模式仍須 Web Locks；一般雲端寫入由伺服器 revision 檢查保護） |
| iOS Safari 15.4+ | 支援，仍由執行時 API 偵測決定 |
| iOS Safari ≤15.3 | 本機模式唯讀並顯示明確提示，保留備份下載；一般雲端模式仍可寫入，伺服器 revision 檢查拒絕過期寫入 |
| 區域網路 HTTP 或缺少 Web Locks | 本機模式唯讀並顯示明確提示；一般雲端模式仍可寫入，伺服器 revision 檢查拒絕過期寫入 |
| `file://` | 不支援／不作保證 |

無 Web Locks 時，本機模式須保留資料讀取、開啟既有考卷及備份下載；所有本機寫入入口須拒寫、顯示可見提示，且原資料不變。一般雲端新增／刪除只透過既有 expected-revision RPC 寫入；過期寫入由伺服器拒絕，顯示版本衝突與重新載入提示，不回落到本機保存或恢復已刪考卷。F3 僅更新文件與驗證，若測試發現產品缺陷即停止回報，不在此修正。

DB-04 程式核對：`cloudStorage.mjs` 的頁面入口須明確啟用離線同步，且 IndexedDB／Web Locks 均可用才傳入 `offline: true`、`requireLocks: true`。缺少能力時改走一般雲端路徑，連線寫入仍受 revision 檢查保護，但不提供離線暫存／重送；`offlineFamilySync.mjs` 在直接要求 `requireLocks: true` 而缺少 Web Locks 時拒絕初始化。此處不修改產品程式。

更新後，已開啟的分頁必須重新載入；舊版分頁不使用這把鎖。

- [ ] **正式發布待辦，尚未完成**：部署前須處理舊版分頁繼續寫入的風險；僅補文件不能使部署切換安全，不將此項列為已完成。

## 實作前停止條件檢查

已讀 `exam.mjs`、`examData.mjs`、`vocabulary.mjs`／`vocabularyData.mjs`、`backup.mjs`／`backupData.mjs`、`cloudStorage.mjs`、`offlineFamilySync.mjs`、`offlineQueue.mjs`、`indexedDbQueueStorage.mjs`、`vocabularyShare.mjs`，及 V-03、AUTH-07、備份與 Supabase 工單和既有 migration。

此規格可直接沿用原集合、驗證器及 RPC；**無須 Supabase schema／migration／RLS、新相依或不相容備份變更，未觸發停止條件**。若後續證據推翻此結論，停止實作交 Owner 決策；不得在此切片引入上述變更。

## 驗收條件與自動測試計畫（不代表實機驗收）

期望來源：Owner 本次 local save/list/reopen/delete、reload、舊備份及 V-06 隱私要求，加上本工單固定快照。L2 feature；只用 Node 內建測試及 VM／儲存介面 doubles，不新增相依。測試先於產品修改執行，期望直接寫固定資料與不變條件，不重寫出題演算法。

- [x] 空／已有資料：產生保存 → 清單 → VM 重載 → 執行實際 `exam.mjs` 渲染原題／解答；移除來源詞條後不變，跨班隔離及空清單。
- [x] 刪除取消、確認、重載、找不到原 ID；最後一卷刪除後仍有可理解空狀態；儲存拒絕可重試且不假報成功。
- [x] 固定舊 v1 備份還原與保存／刪除後 round-trip，逐欄比對固定快照及其他資料，含既有注音／混合題型。
- [x] 真實儲存協調程式配合 RPC／持久儲存 doubles：雲端保存／刪除、revision 衝突與失去 session 拒寫；離線待同步快照跨重開、重送後集合正確。
- [x] 執行 V-06 真實 UI handler 所產生的下載 Blob 僅含所選詞條；DOM／下載是 doubles，詞庫含私人考卷仍不輸出考卷。
- [x] `node --test tests/*.test.mjs` 與適用唯讀治理檢查；結果只據實更新，不以 doubles 代替實機證據。

2026-11-27 獨立審查後第 1 輪返修（L2 bugfix）：從審查診斷複製三項 F2 固定案例及 F1 交錯案例到 repo 測試，不引用 review 目錄。修正前四項為 3 通過／1 失敗，F1 重現復活；修正後新增共 10 項，另涵蓋詞語競寫、還原過期預覽拒寫、複習出卷與刪除競寫、無鎖／鎖拒絕及備份 UI 等待／連點／失敗。全套 `node --test tests/*.test.mjs` 為 **160 通過、0 失敗、0 跳過**，exit 0。皆為介面 doubles，不是實機結果。

外部快照逐一實際突變：固定刪 index 0、移除不存在 ID guard、移除 double-click guard，各被對應 F2 新測試捕獲；移除共用鎖也被 F1 新測試捕獲，四次皆預期 exit 1。產品檔未套用突變。五項唯讀治理檢查（domain contract、drift、hooks、readiness、memory guard）均 exit 0；memory guard 有既存 `missing_canonical_memory=8`，無阻擋項。本輪未執行真實瀏覽器或新的獨立複核，F1／F2 的審查接受狀態仍待 reviewer 確認。

實機驗收前的限制：Node VM 不驗證真實 DOM、下載、IndexedDB／Web Locks 或 Supabase RLS；Owner 清單通過並完成兩次獨立審查前，EX-01 保持未完整驗收。Owner 本次明確禁止 memory 寫入，里程碑／審查記憶紀錄未寫；亦未建立獨立報告檔。

## Owner 實機清單（本次未執行，不列完成）

- [ ] Windows Chrome 與 iPhone Safari：本機新班級保存兩份、切班隔離、重載／關閉再開；刪光原詞條、切到新增詞語後仍可從私人清單重開原題與答案。
- [ ] 同兩裝置：確認／取消刪除、最後一份空狀態、舊連結找不到、儲存空間拒絕提示；核對鍵盤焦點、讀屏名稱及窄螢幕操作。
- [ ] Windows Chrome 與 iPhone Safari 各以同 origin 本機模式開兩個已重載至新版的分頁：預存 E1／E2，交錯刪不同 ID 後重載確認兩份均消失；兩頁刪同 ID，第二次提示已不存在且不刪其他卷。再以刪卷競寫詞語編輯／匯入／一般及複習出卷，確認刪卷不復活且新修改保留；備份預覽後另一頁刪卷，過期還原須拒寫並要求重新選檔。在不支援 Web Locks 的測試環境確認各本機寫入顯示拒寫提示、原資料可讀且不變。
- [ ] 使用合成資料下載完整備份、清空測試資料、還原舊 v1 與新備份，核對原卷題序／注音／挖空；刪除後備份不含該卷。V-06 下載檔只含詞條。
- [ ] 同帳號跨裝置新增／刪除後重新載入；另一家庭開 ID 不可讀；登出／切帳號不顯示上一家庭考卷；兩裝置競寫保留衝突備份且不假報成功。
- [ ] 明確啟用 DB-04 後驗 IndexedDB／Web Locks、離線保存及刪除、關閉再開、連線恢復與衝突人工處置；預設關閉時不宣稱可離線雲端保存。

## 範圍外

EX-02 題目人工校正、EX-03 A4 重組、EX-04 寫回學習紀錄、照片／OCR、新分享／考卷匯出、標題／標籤／搜尋、資料庫及 RLS 改動、新相依、部署、框架變更均不包含。既有列印與批改不擴充。依 Owner 禁令不寫 memory、不提交／推送／開 PR；報告只交付 -o 輸出。
