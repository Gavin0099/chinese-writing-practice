# 中文書寫練習開發計畫

> **最後更新**: 2026-11-11
> **Owner**: Gavin0099
> **Freshness**: Phase (30d)

## Current Phase

- [x] 完成 AI Governance 初始導入與本機驗證。
- [x] 國字查詢 MVP 已通過本機使用流程驗收。
- [x] M1 checkpoint `eb9670f` 已建立，含國字查詢程式、測試與工單。
- [ ] M2 老師詞庫與出卷已完成本機流程與 Windows 虛擬印表機驗收，紙本待驗。
- [ ] 115 上教材等候明確授權，符合公開門檻後接入網站。
- 專案是一個讓家長與老師製作中文練習紙的靜態網站。既有工單保留在 `work/tickets/`。

## Active Sprint

- [x] 固定共用框架版本，套用框架 baseline 與專案規則。
- [x] 安裝 Git hooks，驗證治理設定、版本一致性及 runtime fixtures。
- [x] Owner 確認契約領域為中文書寫練習與列印教材生成，repo 風險分級為低風險。
- [x] D-01 取得並解析中研院 20260723 工作簿，以年度和學期欄位選取 115 上。
- [x] D-02 建立以學年度、出版社、年級、學期與課次識別的本機候選資料。
- [x] D-03 已逐課比對教育百科，194 組一致、7 組字表差異及 1 組未編號單元缺漏。
- [x] [D-03R](work/tickets/d-03r-curriculum-dispositions.md) 完成八筆差異的處置。八筆證據不足，均已隔離。
- [x] [D-04](work/tickets/d-04-curriculum-redistribution.md) 完成授權盤點並記錄公開門檻。2026-11-12 已向中研院與教育百科寄出詢問，115 上候選字表等待明確授權。
- [x] [F-00](work/tickets/f-00-separate-worksheet-history.md) 分開練習紙輸出紀錄及教學進度，完成本機遷移與 Chrome 驗證。實機 iOS Safari 待驗。
- [x] [F-02](work/tickets/f-02-character-lookup-core.md) 以合成教材驗證純查詢核心。
- [x] F-01／F-03／F-04 在本機 Chrome 驗收確認進度、逐字查詢、習寫紀錄和重開保留，見 [國字學習查詢工單](work/tickets/2026-11-11-character-learning-lookup.md)。
- [x] V-01／V-02 建立班級詞庫與手動／批次管理，分開保存各班級與課次的詞語。
- [x] PRINT-FIX 修正 Chrome 練字紙多出空白頁，單頁與四頁練字紙均已回歸驗證。
- [x] V-03 驗證 30 抽 15、題目不足、種子重現、重開後重印與 Windows A4 PDF 列印。
- [x] M2 checkpoint `bba8c4e` 已建立，未納入候選教材與測試產物。
- [x] DATA-Backup 已驗證 30 筆詞語、原考卷、教學進度及習寫紀錄在清除網站資料後可還原。[備份與實機驗收](work/tickets/data-backup-and-device-qa.md)
- [ ] P-QA-01 實體紙本與 iPhone Safari 待驗，使用功能驗收班備份重現流程。
- [x] DB-01 Supabase migration 已在本機 PostgreSQL 驗證，家庭隔離與交易測試通過。
- [ ] DB-03R 專用 Supabase 開發環境已通過 migration、真實 Auth 工作階段、雙帳號 RLS 和兩個 Chrome 設定檔的同步出卷。六位數 Email 收碼與實機跨裝置同步待驗。[Supabase 同步工單](work/tickets/supabase-family-sync.md)
- [x] DB-03M 首次匯入可重試且保護既有雲端資料，習寫紀錄隨獨立 child ID 升級。不同課次的版本衝突已在真實 API 驗證，備份下載已在 Chrome 驗證。
- [ ] QA-DEVICE／M3-Closeout 待 iPhone Safari、Windows 紙本與真實雲端結果，再建立 checkpoint。
- [x] AUTH-07 Google 開發環境驗收通過。真實 Google 手動連結保留原家庭資料；iPhone 儲存第 8 課詞語後，Windows Chrome 同步並產生 15 題考卷與解答。原考卷也可重開。同 Email 自動連結的實測與正式發布審查另列於工單。[AUTH 工單](work/tickets/google-auth.md)

### Slice Backlog

| 階段 | Slice | 交付條件 |
| --- | --- | --- |
| M0 教材 | D-03R、D-04、D-05 | 個別裁決與授權證據齊備後，以獨立版本接入准用的 115 上資料，保留 113 版列印。 |
| M1 國字查詢 | F-00、F-01、F-02、F-03、F-04 | 分開輸出與教學進度，家長可設定教材、手動查詢並記錄孩子習寫。[國字學習查詢工單](work/tickets/2026-11-11-character-learning-lookup.md) |
| M2 老師詞庫與出卷 | V-01、V-02、PRINT-FIX、V-03 | 私人班級詞庫、手動輸入與批次貼上、從確認的詞語抽題及輸出 A4 考卷與解答。[老師詞庫與出卷規格](work/tickets/teacher-vocabulary-worksheets.md) |
| M3 雲端同步 | DATA-Backup、DB-01～DB-03、DB-03R、DB-03M、QA-DEVICE、M3-Closeout、P-03、P-04 | 備份可還原，兩個真實帳號可驗證家庭隔離。同一帳號可從 iPhone 建詞到 Windows 出卷和列印紙本。 |
| Google 登入 MVP | AUTH-00、AUTH-01、AUTH-02、AUTH-03、AUTH-07 | 沿用 Supabase Auth 使用者 ID，驗證 Google 登入、既有帳號連結、家庭隔離及實機同步出卷。 |
| 登入擴充 | AUTH-04、AUTH-05、AUTH-06、AUTH-07 | LINE 先完成 Go／No-Go，Email OTP 備援可並行準備。每次啟用重新執行回歸。 |
| 離線同步 | DB-04 | IndexedDB 離線佇列、重送與衝突處理。 |
| 拍照辨識 | OCR-01、OCR-02、V-04 | 雲端同步驗收後接入拍照及匯入。家長確認後走同一查詢引擎或詞庫。 |
| 詞語複習與交換 | V-05、V-06 | 優先抽錯詞、跨課複習及避免重複。匯出／匯入可由家長自願分享同班詞庫。 |
| 照片與分享 | DB-05、DB-06 | 經同意的照片存入私有儲存區，詞庫由家長明確發起分享。 |
| M4 考卷 | EX-01、EX-02、EX-03、EX-04 | 私人保存考卷、人工校正題目、乾淨版 A4 重組，並將已確認的測驗結果寫回學習紀錄。 |

M1 驗收由家長確認課次、輸入詞語、查看教材收錄和推估教學狀態、記下不會寫的字，重開網站後仍可查看。驗收可使用本機比對一致的教材。D-04 授權與 D-05 公開教材接入獨立處理。

V-01～V-03 排在國字查詢 MVP 之後，先交付手動存詞、選課次抽題及列印考卷與解答，再接入 OCR。V-04 依賴共用 OCR。V-05、V-06 依賴詞庫基礎流程，可與完整考卷辨識分開驗收。

M2 凍結出卷功能。M3 依專用開發環境的 Auth、雙家庭權限測試、同帳號跨裝置出卷及紙本證據收尾。OCR-01／V-04 隨後以真實圈詞作業驗收辨識、人工確認及同步後出卷。

各 Slice 保留兩次獨立審查，分別確認實作和驗收證據。

## Decision Log

- 2026-11-11 採用 Git submodule 固定共用治理框架版本，既有專案事實沿用 `memory/` 中的文件。
- 2026-11-11 採用 owner 確認的低風險契約，依變更內容保留各工單的驗收要求。
- 2026-11-11 國字查詢分別呈現教材收錄、家長確認的教學進度與孩子的習寫表現。先驗證資料與手動查詢，再接入拍照辨識。
- 2026-11-11 老師指定詞語依班級、教材版本與課次獨立儲存。官方生字表與孩子學習紀錄各有自己的資料來源。
- 2026-11-11 採用 Supabase 作為已登入帳號的同步來源。首版保留既有本機模式，雲端寫入檢查版本。IndexedDB 離線能力、照片儲存與分享各自驗收。
- 2026-11-11 登入首版優先 Google。家庭歸屬沿用 Supabase Auth 使用者 ID。既有帳號透過 Supabase 身份連結保留原家庭，Email OTP 備援列入 AUTH-06。

## Known Risks

- Windows Chrome 自訂文字列印的空白頁已修復。iOS Safari 與實體印表機仍須驗證，見 [列印工單](work/tickets/2026-02-03-stabilize-print.md)。
- 更新課綱字表、筆順與字型時，須依各來源核對授權和署名。
- 115 上候選資料仍須處理跨來源差異及確認公開再散布條件。生字欄位和詞語欄位有不同用途，看注音填國字需要核對語境下的讀音。
- 作業、考卷照片與老師詞庫預設為私人。分享前需由家長確認內容及接收對象，辨識成功本身不提供教材再散布授權。
- Supabase 開發專案的 Free 預設寄信服務不接受自訂驗證碼範本。Email 收碼驗收等候該專案的自訂 SMTP。
- Supabase 開發專案已設定 Windows 本機回呼、臨時 iPhone HTTPS 回呼及手動身份連結。Google 端的專用 Web OAuth Client 與 Supabase 回呼已核對，Provider 等候 Owner 填入 Secret 並儲存。

## Anti-Goals

- M2 專注私人班級詞庫、看注音寫國字出卷與列印。正式教材接入、拍照、同步、PWA 與考卷重製依各自階段驗收。
