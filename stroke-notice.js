// 筆順說明改為常駐的原生 details，不再計時彈出或讀寫首次提示紀錄。
// 保留既有入口，供需要直接開啟／收合說明的連結使用。
function showStrokeNoticeModal() {
    const notice = document.getElementById('strokeNoticeModal');
    if (notice) notice.open = true;
}

function closeStrokeNoticeModal() {
    const notice = document.getElementById('strokeNoticeModal');
    if (notice) notice.open = false;
}
