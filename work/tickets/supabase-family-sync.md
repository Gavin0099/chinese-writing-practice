# Supabase 家庭同步

DB-01 提供可重跑的 PostgreSQL migration，保留家庭、孩子學習紀錄、班級詞庫、詞語、考卷快照與版型版本。首版一個 Email 帳號對應一個家庭及現有的一組孩子學習紀錄。班級與考卷識別碼依家庭隔離。教材及照片各有獨立交付條件。

DB-02 使用 Email 驗證碼登入及 RLS。讀取限自己的家庭，寫入由同一筆資料庫交易檢查版本。瀏覽器使用 Publishable Key。本機 Supabase CLI 的開發用 anon key 也可使用。[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [API Keys](https://supabase.com/docs/guides/getting-started/api-keys) · [Email 驗證碼](https://supabase.com/docs/guides/auth/auth-email-passwordless)

DB-03 延用現有前端。在「雲端同步」登入後，可開啟雲端詞庫和學習紀錄。空白家庭可以由使用者上傳目前瀏覽器的備份。雲端寫入成功才顯示已同步。兩台裝置同時編輯時，舊版本的寫入會拒絕，保留畫面輸入供使用者核對。原有本機資料及教材仍在本機模式。

| 後續 Slice | 驗收 |
| --- | --- |
| DB-04 | IndexedDB 本機快取、離線佇列、重送、衝突處理及備份復原。 |
| DB-05 | 照片進私有 Storage，驗證授權存取、短效連結及刪除。 |
| DB-06 | 家長明確分享詞庫，測試接收與撤回。 |

## 本機驗收方法

在 Docker 可用的機器啟動 `supabase/config.toml` 對應的本機服務。依 Supabase 文件建立只綁定 `127.0.0.1` 的 Docker 網路，再執行 `npx --yes supabase@3.1.0 start --network-id <network>`。開啟 `sync.html`，填入本機 API URL `http://127.0.0.1:55431` 及 CLI 提供的 Publishable Key 或 anon key。使用 `http://127.0.0.1:55434` 的測試郵箱讀取驗證碼。[Supabase 本機開發](https://supabase.com/docs/guides/local-development) · [CLI v3](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3)

在本機測試資料庫執行 `psql -v ON_ERROR_STOP=1 -f scripts/test-family-sync.sql`，驗證家庭隔離、匿名拒絕、舊版本拒絕及交易回滾。此腳本建立合成帳號並回滾，應連到本機驗收資料庫。

用測試帳號在 iPhone Safari 新增第八課詞語，看到已同步後關閉頁面。Windows 登入同帳號，確認詞語及注音一致，產生 15 題考卷及對應解答，再重新整理、登出及登入核對資料。另一帳號嘗試開啟原考卷連結應無法讀取。部署時確認 Email 範本含 `{{ .Token }}`，並按站方要求設定寄信服務。

## 2026-11-11 驗收狀態

- 本機 PostgreSQL 18 套用 migration，以合成 Auth claims 驗證兩家庭隔離、匿名拒絕、直接寫入拒絕、版本衝突及交易回滾。
- Windows Chrome 與 Chrome 的 iPhone 尺寸環境，使用真實 Supabase JavaScript SDK 和模擬 Auth／Data API，驗證匯入 30 詞、手機畫面新增第八課詞語、電腦出卷、舊版本拒絕、重開及登出再登入。不同帳號讀取原考卷連結時，畫面未顯示考卷。
- Docker 引擎未回應，替代的 WSL 原生 CLI 下載逾時。Supabase 真實 Email 驗證和實機跨裝置驗收待可用的測試環境。

## DB-03M 首次匯入與衝突

- PostgreSQL 18 從 DB-01 的既有資料升級，保留原本的 revision 和習寫紀錄。進度與習寫紀錄使用獨立的 `child_id`，資料庫確保這個孩子屬於同一個家庭。詞庫與考卷仍依家庭保存。
- 首次上傳由資料庫在同一交易內檢查家庭 revision 並記錄備份指紋。即使匯出時間不同，同一份資料重試也不會新增紀錄或還原後續修改。家庭已有其他雲端資料時，保留雲端紀錄並指引家長下載本機備份核對。
- 兩台裝置各改不同課次仍使用同一個家庭 revision。落後的裝置可下載包含這次修改的 JSON，再重新載入並手動補登。可在「本機備份與還原」選取該檔案預覽。若要在本機還原核對，先備份目前的本機紀錄。

## DB-03R 專用開發環境驗收

1. 確認 Dashboard 的專案名稱及 ref 指向本專案專用的 Supabase 開發環境。登入 Supabase CLI v3，對這個 ref 先做 dry run。核對目標和待套用的 migration 後執行 push。[CLI 文件](https://supabase.com/docs/reference/cli/supabase-db-push)

   ```powershell
   supabase link --project-ref <dev-project-ref>
   supabase db push --dry-run --remote=<dev-project-ref>
   supabase db push --remote=<dev-project-ref>
   ```

2. 在開發專案設定 Email 註冊與登入範本的 `{{ .Token }}`，以兩個已同意收信的測試信箱完成收碼登入。預設郵件服務僅寄送給專案團隊成員。其他測試信箱需要開發環境的自訂 SMTP。[Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
3. 在測試站以帳號 A 匯入合成備份，以另一個瀏覽器設定檔登入帳號 B 並建立自己的詞庫。透過頁面使用的 Supabase SDK，以 B 的登入狀態查詢 A 的家庭 ID。`families` 用 `id` 篩選，`family_children`、`family_learning_records`、`family_class_books`、`family_words` 及 `family_exams` 用 `family_id` 篩選，都應回傳空集合。以 B 對 A 的已知詞語嘗試直接 insert、update、delete 應回傳權限拒絕。最後用 A 核對原始紀錄及 revision，並以 B 核對自己的紀錄仍可透過同步功能讀寫。
4. 用同一測試帳號在 iPhone Safari 新增第八課詞語，在 Windows 查到同一筆詞語與注音，產生 15 題考卷及解答並印出紙本。重新整理、登出登入後核對資料。用兩台裝置分別更改第七和第八課，驗證晚送出的修改可下載備份。僅使用合成資料。

### 開發環境進度

- 專用 Free 開發專案 `chinese-writing-practice-dev` 已建立。CLI v2.109.1 使用 `--linked`，每次 dry run 核對目標與清單後才套用。遠端清單已確認三個版本 `20261111000000`、`20261111001000`、`20261111002000`。
- 真實 API 驗收發現，開發環境的 PostgREST 14 對代表版本衝突的 `40001` 反覆重試，回傳上游逾時。第三個 migration 改用 `PT409` 回報 HTTP 409。原本的版本檢查與衝突備份行為保留。[Supabase 已知問題](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b)
- 用管理 API 產生合成帳號的 OTP，再由一般 SDK 驗證碼登入。第二個帳號無法查詢第一個家庭的六張表，直接新增、修改與刪除對方的詞語均遭拒絕。原家庭紀錄及版本保持一致。測試未經 SMTP 寄信。
- 真實 API 驗證同一份 30 詞備份可重試且保留原考卷與習寫紀錄。後續修改不會被重試覆蓋。兩個工作階段分別編輯第七及第八課，舊版本回傳 HTTP 409，保留未送出的內容，重新載入後可補登。Chrome 模擬 API 驗收已實際下載並核對草稿 JSON。
- 真實開發資料庫接上 Chrome 的手機尺寸與 Windows 桌面兩個獨立設定檔。手機尺寸頁新增第八課詞語後，桌面讀到同一筆詞語並產生 15 題及解答，重新整理後題卷仍可開啟。
- Free 專案使用預設郵件服務時，Supabase 拒絕更新驗證碼範本。要從網站寄出並輸入六位數驗證碼，需先在這個開發專案配置自訂 SMTP，再以可收信的測試帳號驗證。[Supabase Auth 寄信設定](https://supabase.com/docs/guides/auth/auth-smtp)
- iPhone Safari 與 Windows 實體紙本尚待驗收。真實 Email 與實機條件通過後再建立 M3 checkpoint。
