# AUTH 系列｜Google 登入與家庭資料

Phase A 依序驗收 AUTH-00、AUTH-01、AUTH-02、AUTH-03 及 AUTH-07。Google 是主要登入入口。Phase B 先執行 LINE 技術驗證，再決定是否整合。Phase C 配置 Email OTP 備援，可與 Phase B 並行。每次啟用新登入方式都重跑 AUTH-07。

家庭歸屬以 Supabase Auth 使用者 ID 為準。資料庫沿用 `auth.uid() → families.owner_id → family_id → child_id`。詞庫與考卷依家庭保存。連結身份只使用 Supabase Auth，應用程式不會按 Email 搜尋或合併家庭。連結前可從帳號頁下載雲端備份，驗收需核對原帳號及備份的內容。

## 工單契約

```yaml
slices:
  - slice_id: AUTH-00
    goal: 固定身份與家庭資料契約
    priority: P0
    depends_on: [DB-03]
    scope: [沿用 auth.uid 與 family_id 和 child_id 關聯, 下載既有雲端資料備份]
    non_goals: [家庭資料 migration, 多孩子, 共同管理]
    acceptance: [登入方式不改變家庭與孩子 ID, 首次登入不自動匯入資料, 既有雙家庭 RLS 持續通過]
    evidence: [cloud_backup, database_and_rls_regression]
    release: {require_owner_review: true}
  - slice_id: AUTH-01
    goal: Google OAuth 與 PKCE 回呼
    priority: P0
    depends_on: [AUTH-00]
    scope: [Google Web OAuth Client, Supabase Google Provider, 精確回呼允許清單, Session 還原]
    non_goals: [LINE, Email SMTP, OCR]
    acceptance: [真實 Google 帳號可登入和重開, 取消與失敗可重試, 無效或過期回呼不進工作區]
    evidence: [automated_tests, real_google_auth, browser_test, redacted_logs]
    release: {require_owner_review: true}
  - slice_id: AUTH-02
    goal: 為既有帳號連結 Google
    priority: P0
    depends_on: [AUTH-01]
    scope: [同驗證 Email 的 Supabase 自動連結, 已登入者確認後的手動連結, 帳號與資料核對]
    non_goals: [按 Email 合併家庭, 資料搬移, 身份解除連結]
    acceptance: [同一帳號保留 30 詞及考卷與習寫紀錄, family_id 和 child_id 一致, 重試或已被他人連結不建第二份家庭]
    evidence: [before_after_cloud_backup, real_google_link, conflict_and_cancel_tests]
    release: {require_owner_review: true}
  - slice_id: AUTH-03
    goal: 登入介面和跨裝置操作
    priority: P0
    depends_on: [AUTH-01, AUTH-02]
    scope: [Google 入口, 本機工具入口, 重新登入與返回原頁, 登出及連線恢復]
    non_goals: [正式 Email OTP, 實體印表機驗收]
    acceptance: [iPhone Safari 新增第八課詞語後 Windows Chrome 可出卷, 重新整理保持登入, 取消及斷線後可恢復操作]
    evidence: [browser_test, iphone_safari, windows_chrome, redacted_logs]
    release: {require_owner_review: true}
  - slice_id: AUTH-04
    goal: LINE Login 相容性驗證
    priority: P1
    depends_on: [AUTH-00]
    scope: [測試 Channel, Custom OAuth 或 OIDC, Callback, LINE 內建瀏覽器, 缺 Email]
    non_goals: [正式 LINE 登入, 家庭資料匯入]
    acceptance: [實際 LINE 授權取得可信 Supabase Session, 或記錄 No-Go 與可重現的阻礙]
    evidence: [provider_spike, redacted_callback_result]
    release: {require_owner_review: true}
  - slice_id: AUTH-05
    goal: 正式接入 LINE 登入與連結
    priority: P1
    depends_on: [AUTH-04 Go]
    scope: [LINE 登入, 已登入者確認連結, iPhone 與 LINE 內建瀏覽器及 Windows QR]
    non_goals: [把 Email 當作必填 LINE 身份, 家庭合併]
    acceptance: [已連結 Google 和 LINE 指向同一家庭, 未連結者隔離, 三種裝置流程通過]
    evidence: [real_line_auth, device_test, identity_and_rls_regression]
    release: {require_owner_review: true}
  - slice_id: AUTH-06
    goal: 自訂 SMTP 與 Email OTP 備援
    priority: P1
    depends_on: [AUTH-00]
    scope: [寄件網域驗證, 六位數範本, 錯誤與逾時和重寄限制]
    non_goals: [公開測試收件資訊, 強制啟用於 Google MVP]
    acceptance: [收信登入成功, 過期和錯誤碼及重寄可恢復, 既有帳號不新增家庭]
    evidence: [real_email_auth, negative_otp_cases, existing_family_check]
    release: {require_owner_review: true}
  - slice_id: AUTH-07
    goal: 每階段安全回歸及結案
    priority: P0
    depends_on: [本階段已啟用功能]
    scope: [雙家庭 RLS, 連結保留資料, 備份還原, HTTP 409, 考卷重建, 登出及憑證檢查]
    non_goals: [尚未啟用的登入方式, D-04, 紙本列印]
    acceptance: [重跑現有回歸和真實登入, 原 15 題及解答可重建, 日誌和 Git 無敏感憑證]
    evidence: [automated_tests, real_auth_e2e, sync_and_print_preview, secret_review]
    release: {require_owner_review: true}
```

整個 AUTH 系列維持既有 DB-03 交易與出卷。多孩子、多家長、分享、離線合併及 OCR 各由原工單處理。D-04 授權與紙本列印仍由各自的發布條件驗收。

## Google 開發環境設定

1. 在 Google Auth Platform 使用本專案專用的測試 Google Cloud 專案。設定測試對象與實際測試帳號，授權範圍使用 `openid`、Email 與個人基本資料。建立 Web application OAuth Client。開發端 Google callback 登記 `https://<dev-project-ref>.supabase.co/auth/v1/callback`，以測試專案的實際 ref 取代樣板。測試網站的 origin 填入 Authorized JavaScript origins。[Supabase Google 設定](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) · [Google Auth Platform](https://console.cloud.google.com/auth/clients)
2. 在專用 Supabase 開發專案啟用 Google Provider，直接填入 Google Client ID 和 Secret。Supabase 的 Redirect URLs 精確加入 `http://127.0.0.1:8765/sync.html` 及實際核准的 HTTPS 測試站 `/sync.html`。正式環境使用其對應的 OAuth Client、Supabase 專案及正式網域。先確認正式 URL，再新增允許項目。[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
3. 手動連結先在開發專案開啟 Allow manual linking。此功能仍屬 Beta。相同已驗證 Email 交由 Supabase 自動連結。若舊帳號已登出且 Google Email 不同，先用舊登入方式恢復該帳號，再主動連結；AUTH-06 完成前，需已有有效的舊帳號 Session 才能在頁面連結不同 Email。[Supabase 身份連結](https://supabase.com/docs/guides/auth/auth-identity-linking)
4. 開發者可在 `sync.html` 設定專案網址與 Publishable Key。提供給家長的站點在部署副本配置 `cloudConfig.mjs` 的專案 URL 和 Publishable Key。確認手動連結驗收通過後再開啟 `allowGoogleLink`。Google Client Secret 與 Supabase Secret／Service Role Key 留在管理端。正式介面先只提供 Google，本機驗收仍可使用原有 Email 測試表單。
5. 用真實測試帳號確認 Session 還原、取消和重試，並核對兩個不同家庭。使用合成的 30 詞備份做連結驗收，核對 Auth ID、家庭 ID、孩子 ID、revision 與原有資料。以可從 iPhone 存取的 HTTPS 測試站新增第 8 課詞語，Windows Chrome 開啟並產生考卷與解答。

## LINE 唯讀研究

Supabase Custom OAuth／OIDC Provider 可走 Supabase Auth 並設定 Email optional。AUTH-04 優先評估這條路徑，測試 LINE 的識別值、Callback、沒有 Email 及行動裝置切換。可行性仍要以真實 LINE 授權和回來的 Supabase Session 判定。LINE v2.1 的 Email 權限需申請。[Supabase 自訂 Provider](https://supabase.com/docs/guides/auth/custom-oauth-providers) · [LINE Login v2.1](https://developers.line.biz/en/docs/line-login/integrate-line-login/)

## 2026-11-11 Phase A 驗收

- AUTH-00 已沿用原資料模型。重新跑真實開發專案的雙家庭 RLS、30 詞匯入重試、409 衝突及跨 Chrome 設定檔出卷。驗收用合成資料，兩個帳號的直接跨家庭寫入均遭拒絕。
- AUTH-01～AUTH-03 已接上 PKCE、雲端備份與已登入帳號的手動連結。Windows Chrome 與 Chrome 手機尺寸以真實 Supabase SDK 和模擬 OAuth 回呼驗證取消、網路中斷、Provider 關閉、原考卷解答返回、Session 過期、其他家庭考卷隔離、連結衝突與重試。模擬連結後可重新登入並開啟原 30 詞、考卷、教學進度與習寫紀錄。
- AUTH-07 的自動測試、備份還原及既有真實 Supabase 回歸通過。仍需以真實 Google 帳號驗證同 Email 自動連結、不同 Email 手動連結與家庭和孩子 ID，再做 iPhone Safari 和 Windows Chrome 操作。正式發布保留 Owner review。

已在專用 Supabase 開發專案設定 Site URL 為 `http://127.0.0.1:8765`，加入精確的 `http://127.0.0.1:8765/sync.html` 回呼並啟用手動身份連結。CLI 重新核對 Auth 設定一致。Client Secret 由 Owner 直接填入管理頁。

已建立 Google Cloud 專案 `chinese-writing-practice-dev` 並選擇外部測試對象。臨時 iPhone HTTPS 入口已驗證可存取允許的應用程式檔案，根目錄及未允許檔案回傳 404。Supabase 開發專案已加入該入口的精確回呼，CLI 再次核對 Auth 設定一致。

2026-11-12 已完成 Google 品牌設定並建立 `Chinese Writing Practice Dev` 網頁 OAuth 用戶端。從 Google 已儲存設定核對本機來源與 Supabase 回呼。Owner 已儲存新密鑰；Supabase 管理頁與開發專案 Auth API 均確認 Google Provider 已啟用。臨時 iPhone HTTPS 入口重新檢查回傳 200。合成的舊帳號已準備好，保留 30 筆詞語與原考卷、習寫紀錄的連結前快照，供真實 OAuth 比對。

2026-11-12 AUTH-07 重跑 28 項自動測試與開發環境雙家庭 RLS、匯入重試、409 衝突和 15 題考卷重建，皆通過。首次操作時測試工具自動關閉網站的連結確認框；修正測試流程後，同一個合成舊帳號已發起連結並到達 Google 授權頁。

2026-11-12 Windows 使用一般 Chrome 完成真實 Google 手動連結並回到雲端同步頁。開發環境確認原 Auth、家庭及孩子 ID 與資料版本一致，完整比對連結前後的備份相同，包含 30 筆詞語、15 題考卷、教學進度與習寫紀錄。此輪尚未實測同 Email 自動連結。

手機輸入驗收發現，詞庫原先拒絕明示的一聲橫線。修正後在儲存前省略一聲符號，保留其他聲調；注音組數錯誤與字元格式錯誤分開提示。29 項單元測試通過，HTTPS 驗收站亦確認可接受並正規化帶有一聲橫線的「紙風車」。

2026-11-12 AUTH-07 Google 開發環境驗收通過。Owner 回報用 iPhone Safari 儲存第 8 課「紙風車」。雲端確認同一測試帳號有 iPhone 登入，並收到已核對的第 8 課詞語及注音。Windows Chrome 讀到新詞後產生 15 題考卷及解答，重新整理仍能重建。另從雲端重開原有考卷，確認原卷和新卷各有 15 個題號與相對應的 15 個解答，均可開啟列印／儲存 PDF 控制項。雙家庭隔離、備份還原、409 衝突及登出回歸通過。此次憑證檢查涵蓋工作樹及採用的驗收日誌。同 Email 自動連結的真實 Google 實測與正式發布的 Owner review 仍保留。
