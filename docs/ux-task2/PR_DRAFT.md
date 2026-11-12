# Draft PR 準備稿（尚未建立遠端 PR）

Title: 改善家長手機詞庫、出卷與資料保存流程

老師詞庫原本把完整單筆表單與詞語清單排在出卷前，批次貼上也藏在單筆表單後。這次將出卷／已存考卷提前，班級旁提供單筆及批次捷徑，並在首頁與首次設定中提升詞庫入口。

保存文案現在區分本機瀏覽器與家庭雲端，並分清「已核對注音」與真正可抽題數。加入 screen-only 44px 操作目標、清楚焦點、原生 details、可用 Escape 關閉的既有提示。沒有改資料契約、教材、Auth、同步、備份還原或列印 renderer。

驗證：六頁 HTTP 與靜態 DOM／表單／ID 檢查通過；14 個列印／資料檔逐 byte 不變；原 CSS 完整保留，新增規則全限於 screen。Node 不存在，29 項測試未跑；Chrome 無法啟動／存取，因此 Windows 390px／1280px、鍵盤實際走查、after 圖、PDF 像素、iPhone Safari 與紙本列印仍未驗。詳見 TEST_NOTES.md、COMPARISON.md。

提交、推送與 Draft PR 建立交由 harness；本次沒有 git 寫入、合併或部署。`.agents/skills/impeccable` 仍需 harness 清除（沙箱唯讀導致刪除失敗），不可納入提交。artifacts 不提交。
