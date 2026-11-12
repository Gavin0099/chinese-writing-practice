# Draft PR 準備內容（尚未建立遠端 PR）

標題：`讓家長直接管理老師詞庫、批次貼上與出卷`

手機家長原本先遇到練習紙年級引導，詞庫頁又把出卷放在新增表單和整份詞語清單之後。這次在首頁提供詞庫／出卷直達，把出卷及歷史移到詞庫操作前段，並讓單筆與批次輸入以原生 disclosure 各自展開。資料來源、已核對注音與真正可抽題數分開說明，本機備份及雲端家庭資料的用途更明確。

螢幕控制補上 44px 最小尺寸、可見焦點與鍵盤可關閉的既有 overlay。保留全部既有 ID／form 控制、資料／Auth／同步邏輯、抽題及列印 renderer；所有 CSS 追加內容限定 screen。

驗證：`git diff --check`、四份 JS 語法解析、121 個既有 ID／form 契約檢查、33 個受保護檔案逐位元組比對及 HTTP 資源檢查通過。**Node CLI 不可用，29 項測試未執行；Chrome 啟動失敗，after 截圖、Windows 390／1280 視覺與鍵盤、A4 像素比較、iPhone Safari、實體列印及真實雲端流程皆待驗。** 詳見 `TEST_NOTES.md`。

追溯：[問題](ISSUES.md) · [原方案](PLAN.md) · [前後結構及畫面](VISUAL_COMPARISON.md) · [偏差](DEVIATIONS.md) · [範圍](OUT_OF_SCOPE.md) · [驗證](TEST_NOTES.md)。

由實驗 harness 提交程式與文件後，用含這些差異的分支建立 **Draft** PR；驗收補齊前保持 Draft。不自動合併、不部署、不納入 artifacts。本次未執行遠端 PR 操作。
