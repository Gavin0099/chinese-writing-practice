// 筆順說明改為隨時可讀的行內說明，不在首次或回訪時自動打斷操作。
function showStrokeNoticeModal() {
    const notice = document.getElementById('strokeNoticeModal');
    if (notice) notice.open = true;
}

function closeStrokeNoticeModal() {
    const notice = document.getElementById('strokeNoticeModal');
    if (notice) {
        notice.open = false;
        notice.querySelector('summary').focus();
    }
}
