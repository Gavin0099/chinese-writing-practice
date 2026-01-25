// JS for Vertical Stack Header + Real Stroke Rendering (cnchar)
const charactersInput = document.getElementById('characters');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewArea = document.querySelector('.preview-section');

const CHARS_PER_PAGE = 6;

// A. Global DB & Init
let charDB = {};

// Direct Load from db_core.js (Silver Bullet Solution)
function loadCharDatabase() {
    if (window.MOE_DATA) {
        charDB = window.MOE_DATA;
        console.log("✅ 教育部權威資料庫已掛載，字數：", Object.keys(charDB).length);
    } else {
        console.error("❌ 嚴重錯誤：找不到 window.MOE_DATA，請確認 db_core.js 有正確載入！");
        // Fallback to empty to prevent crash
        charDB = {};
    }
}
// Init immediately when DOM loads
document.addEventListener('DOMContentLoaded', loadCharDatabase);

// Initial Setup - Register Plugins
if (window.cnchar) {
    if (window.cncharOrder) cnchar.use(window.cncharOrder);
    if (window.cncharTrad) cnchar.use(window.cncharTrad);
    if (window.cncharPoly) cnchar.use(window.cncharPoly); // Required for Shape/Poly
    if (window.cncharDraw) cnchar.use(window.cncharDraw); // Required for SVG paths
}

generateBtn.addEventListener('click', () => {
    const text = charactersInput.value.replace(/\s+/g, '');
    if (!text) { alert('請輸入生字'); return; }
    renderSheets(text);
});
downloadBtn.addEventListener('click', () => window.print());

function renderSheets(text) {
    let container = document.getElementById('sheets-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'sheets-container';
        previewArea.appendChild(container); // Reset
    }
    container.innerHTML = '';

    const chars = Array.from(text);
    const totalPages = Math.ceil(chars.length / CHARS_PER_PAGE);

    for (let i = 0; i < totalPages; i++) {
        const pageChars = chars.slice(i * CHARS_PER_PAGE, (i + 1) * CHARS_PER_PAGE);
        const pageDOM = createPage(pageChars);
        container.appendChild(pageDOM);
    }
}

function createPage(chars) {
    const page = document.createElement('div');
    page.className = 'sheet-page';

    // 1. Sidebar (Simplified)
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-block-top">
             <span class="sidebar-title-vocab">生字</span>
        </div>
        <div class="sidebar-block-strokes">
            <span>筆順</span>
        </div>
        <div class="sidebar-block-practice">
            <span>生字練習</span>
        </div>
    `;
    page.appendChild(sidebar);

    // 2. Content
    const content = document.createElement('div');
    content.className = 'content-area';
    page.appendChild(content);

    for (let i = 0; i < CHARS_PER_PAGE; i++) {
        const char = chars[i] || '';
        content.appendChild(createCharColumn(char));
    }

    return page;
}

function createCharColumn(char) {
    const col = document.createElement('div');
    col.className = 'char-col';

    // 1. Fetch Metadata (Priority: MOE > cnchar)
    let charData = { zhuyin: '', radical: '', strokeCount: '' };

    if (char) {
        // Try MOE DB first (Global Variable)
        if (charDB[char]) {
            const entry = charDB[char];
            console.log('📚 使用教育部資料:', char);

            // Zhuyin: Use the first pronunciation from the array
            charData.zhuyin = (Array.isArray(entry.zhuyin) && entry.zhuyin.length > 0)
                ? entry.zhuyin[0]
                : (typeof entry.zhuyin === 'string' ? entry.zhuyin : '');

            charData.radical = entry.radical || '';
            charData.strokeCount = entry.totalStrokes || '';
        } else {
            console.warn(`⚠️ 資料庫無此字：${char}，使用 cnchar 備用`);
            // Fallback to cnchar (might result in Pinyin/Hao)
            try {
                if (window.cnchar) {
                    const zRaw = cnchar.spell(char, 'tone');
                    charData.zhuyin = Array.isArray(zRaw) ? zRaw[0] : zRaw;
                    charData.strokeCount = cnchar.stroke(char, 'count');
                }
            } catch (e) { console.error('cnchar 錯誤:', e); }
        }
    }

    // A. Header
    const header = document.createElement('div');
    header.className = 'sec-header';

    // Parse Zhuyin into symbols and tone for standard Taiwan layout
    let symbolsHTML = '';
    let toneHTML = '';

    if (charData.zhuyin) {
        const tones = ['ˊ', 'ˇ', 'ˋ', '˙'];
        let symbolsList = [];
        let toneMark = '';

        for (const c of charData.zhuyin) {
            if (tones.includes(c)) {
                toneMark = c;
            } else {
                symbolsList.push(c);
            }
        }

        symbolsHTML = symbolsList.map(s => `<div>${s}</div>`).join('');
        // Neutral tone (dot) is usually at the top, others on the right middle
        toneHTML = toneMark ? `<div class="zhuyin-tone ${toneMark === '˙' ? 'tone-neutral' : ''}">${toneMark}</div>` : '';
    }

    header.innerHTML = `
        <div class="zhuyin-box">
             <div class="zhuyin-symbols">${symbolsHTML}</div>
             ${toneHTML}
        </div>
        <div class="big-char-box tian-zi-ge">
             <span class="char-text">${char}</span>
        </div>
    `;
    col.appendChild(header);

    // B. Meta
    const meta = document.createElement('div');
    meta.className = 'sec-meta';

    if (char) {
        meta.innerHTML = `
            <div class="meta-row meta-strokes">${charData.strokeCount}</div>
            <div class="meta-row meta-radical">${charData.radical || ''}</div>
        `;
    } else {
        meta.innerHTML = `<div class="meta-row"></div><div class="meta-row"></div>`;
    }
    col.appendChild(meta);

    // C. Stroke Order
    const strokesContainer = document.createElement('div');
    strokesContainer.className = 'sec-strokes';
    col.appendChild(strokesContainer);

    // Call renderer
    renderStrokeOrder(strokesContainer, char);

    // D & E. Practice Group
    const practiceGroup = document.createElement('div');
    practiceGroup.className = 'sec-practice-group';

    for (let t = 0; t < 2; t++) {
        const cell = document.createElement('div');
        cell.className = 'practice-cell tian-zi-ge';
        if (char) cell.innerHTML = `<span class="char-trace">${char}</span>`;
        practiceGroup.appendChild(cell);
    }
    for (let p = 0; p < 5; p++) {
        const cell = document.createElement('div');
        cell.className = 'practice-cell tian-zi-ge';
        practiceGroup.appendChild(cell);
    }
    col.appendChild(practiceGroup);

    return col;
}

// Dedicated Stroke Renderer using HanziWriter RAW Data (Static Mode)
async function renderStrokeOrder(container, char) {
    if (!char) return;
    container.innerHTML = '<div style="font-size:12px; color:#999; padding: 10px;">載入中...</div>';

    try {
        // 1. Fetch RAW Data (No Animation Engine overhead)
        if (typeof HanziWriter === 'undefined') {
            throw new Error('HanziWriter not loaded');
        }

        const charData = await HanziWriter.loadCharacterData(char);
        container.innerHTML = ''; // Clear loading

        const strokes = charData.strokes;

        if (!strokes || strokes.length === 0) {
            container.innerHTML = '<span style="color:#ccc; font-size:10px;">無資料</span>';
            return;
        }

        // 2. Render Loop (Progressive)
        // Adjusting for 3x10 vertical grid (30 steps max)
        const maxSteps = Math.min(strokes.length, 30);

        for (let step = 0; step < maxSteps; step++) {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'stroke-step';

            // Build SVG
            // HanziWriter data is 1024x1024 and inverted Y-axis.
            // Using transform to correct orientation.
            let svgHTML = `
                <svg viewBox="0 0 1024 1024" width="100%" height="100%" style="display:block;">
                    <g transform="scale(1, -1) translate(0, -900)">
            `;

            for (let i = 0; i <= step; i++) {
                const color = (i === step) ? '#000000' : '#D1D5DB';
                svgHTML += `<path d="${strokes[i]}" fill="${color}" />`;
            }

            svgHTML += `</g></svg>`;
            stepDiv.innerHTML = svgHTML;
            container.appendChild(stepDiv);
        }

    } catch (e) {
        console.error("❌ 筆順資料加載失敗:", e);
        container.innerHTML = `<span style="color:red; font-size:10px;">渲染失敗</span>`;
    }
}

