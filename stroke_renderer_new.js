// Dedicated Stroke Renderer using HanziWriter
async function renderStrokeOrder(container, char) {
    if (!char) return;
    console.log('🎨 開始渲染筆順:', char);

    // Get stroke count
    let strokeCount = 0;
    try {
        if (window.cnchar) {
            strokeCount = cnchar.stroke(char, 'count');
            console.log('筆畫數:', strokeCount);
        }
    } catch (e) {
        console.error("❌ cnchar 錯誤:", e);
    }

    if (strokeCount === 0 || strokeCount > 30) {
        container.innerHTML = '<span style="font-size:10px; color:#999;">無筆順資料</span>';
        return;
    }

    container.innerHTML = '';
    const displayCount = Math.min(strokeCount, 10);

    // Use HanziWriter if available
    if (typeof HanziWriter !== 'undefined') {
        console.log('✅ 使用 HanziWriter 顯示筆順');
        for (let i = 1; i <= displayCount; i++) {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'stroke-step';
            const uniqueId = 'stroke-' + char.charCodeAt(0) + '-' + i + '-' + Math.random().toString(36).substr(2, 9);
            stepDiv.id = uniqueId;
            container.appendChild(stepDiv);

            setTimeout(() => {
                try {
                    const writer = HanziWriter.create(uniqueId, char, {
                        width: 50,
                        height: 50,
                        padding: 2,
                        showOutline: false,
                        strokeColor: '#000',
                        radicalColor: '#000',
                        delayBetweenStrokes: 0,
                        strokeAnimationSpeed: 1,
                        drawingWidth: 25
                    });
                    for (let j = 0; j < i; j++) {
                        writer.showStroke(j);
                    }
                } catch (e) {
                    console.error('HanziWriter 錯誤:', e);
                    document.getElementById(uniqueId).innerHTML = '<span style="font-size: 14px; color: #3B4CCA;">' + i + '</span>';
                }
            }, 50);
        }
    } else {
        console.warn('⚠️ HanziWriter 未載入,使用數字');
        for (let i = 1; i <= displayCount; i++) {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'stroke-step';
            stepDiv.innerHTML = '<span style="font-size: 16px; font-weight: bold; color: #3B4CCA;">' + i + '</span>';
            container.appendChild(stepDiv);
        }
    }
}
