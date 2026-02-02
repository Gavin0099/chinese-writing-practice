// ============================================
// 字格反轉診斷腳本 (完整版)
// ============================================

console.log("=== 開始診斷 ===\n");

// 1. 一般狀態診斷
const content = document.querySelector('.content-area');
if (!content) {
    console.error('❌ 找不到 .content-area');
} else {
    const cols = [...content.querySelectorAll('.char-col')];
    const cs = getComputedStyle(content);

    console.log('=== DOM 順序 ===');
    console.log('DOM order:', cols.map((el, i) => {
        const charText = el.querySelector('.char-text');
        return `[${i}] ${charText ? charText.textContent.trim() : 'empty'}`;
    }));

    console.log('\n=== .content-area 的 Computed Style ===');
    console.log('.content-area display:', cs.display);
    console.log('.content-area writingMode:', cs.writingMode);
    console.log('.content-area direction:', cs.direction);
    console.log('.content-area flexDirection:', cs.flexDirection);

    if (cols[0]) {
        const colCs = getComputedStyle(cols[0]);
        console.log('\n=== 第一個 .char-col 的 Computed Style ===');
        console.log('.char-col writingMode:', colCs.writingMode);
        console.log('.char-col direction:', colCs.direction);
    }
}

// 2. 列印狀態診斷 (hook)
console.log('\n=== 已註冊列印事件監聽器 ===');
console.log('當您按下「列印」或「下載 PDF」時,會自動顯示列印前的狀態\n');

window.addEventListener("beforeprint", () => {
    const content = document.querySelector('.content-area');
    if (!content) return console.error('❌ 找不到 .content-area (列印模式)');

    const cols = [...content.querySelectorAll('.char-col')];
    const cs = getComputedStyle(content);

    console.log("\n\n=== BEFORE PRINT ===");
    console.log("DOM order:", cols.map(el => el.querySelector('.char-text')?.textContent.trim()));
    console.log("content writingMode:", cs.writingMode);
    console.log("content direction:", cs.direction);
    console.log("content display:", cs.display);
});

window.addEventListener("afterprint", () => {
    console.log("=== AFTER PRINT ===\n");
});

console.log("✅ 診斷腳本載入完成!");
console.log("請將以下 3 行資訊回報:");
console.log("1. DOM order: ...");
console.log("2. .content-area writingMode: ...");
console.log("3. .content-area display: ...");
