// ========================================
// 筆順說明提示功能
// ========================================

let restoreStrokeNoticeFocus = null;

/**
 * 顯示筆順說明 Modal
 */
function showStrokeNoticeModal() {
    const overlay = document.getElementById('strokeNoticeModal');
    if (overlay) {
        overlay.classList.add('active');
        overlay.inert = false;
        restoreStrokeNoticeFocus ??= wireOverlayKeyboard(overlay, closeStrokeNoticeModal);
    }
}

/**
 * 關閉筆順說明 Modal
 */
function closeStrokeNoticeModal() {
    const overlay = document.getElementById('strokeNoticeModal');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.inert = true;
        restoreStrokeNoticeFocus?.();
        restoreStrokeNoticeFocus = null;
    }
}

/**
 * 初始化筆順說明
 */
function initStrokeNotice() {
    // 檢查是否已經顯示過
    const hasShown = localStorage.getItem('strokeNoticeShown');

    if (!hasShown) {
        // 首次使用,3秒後顯示提示
        setTimeout(() => {
            showStrokeNoticeModal();
            localStorage.setItem('strokeNoticeShown', 'true');
        }, 3000);
    }
}

// 頁面載入時初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStrokeNotice);
} else {
    initStrokeNotice();
}
