// JS for Vertical Stack Header + Real Stroke Rendering (cnchar)
const charactersInput = document.getElementById('characters');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewArea = document.querySelector('.preview-section');

const CHARS_PER_PAGE = 6;

// A. Global DB & Init
let charDB = {};

// Load from embedded data (no CORS issues)
function loadCharDatabase() {
    if (typeof CHAR_DATABASE !== 'undefined') {
        charDB = CHAR_DATABASE;
        console.log("✅ 資料庫已載入。字數:", Object.keys(charDB).length);
    } else {
        console.warn("❌ 找不到內嵌資料庫 CHAR_DATABASE");
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

    // 1. Fetch Metadata (Priority: DB > cnchar)
    let charData = { zhuyin: '', radical: '', strokeCount: '' };

    if (char) {
        // Try DB first
        if (charDB[char]) {
            const entry = charDB[char];
            console.log('📚 從資料庫讀取:', char, entry);
            // Zhuyin: First one
            charData.zhuyin = (Array.isArray(entry.zhuyin) && entry.zhuyin.length > 0)
                ? entry.zhuyin[0]
                : (typeof entry.zhuyin === 'string' ? entry.zhuyin : '');
            charData.radical = entry.radical || '';
            charData.strokeCount = entry.totalStrokes || '';
            console.log('✅ 解析結果:', charData);
        } else {
            console.log('⚠️ 資料庫中找不到:', char, '使用 cnchar 後備');
            // Fallback to cnchar
            try {
                if (window.cnchar) {
                    // Get Zhuyin
                    const zRaw = cnchar.spell(char, 'tone');
                    charData.zhuyin = Array.isArray(zRaw) ? zRaw[0] : zRaw;

                    // Radical?
                    // cnchar.radical() returns objects often. Simplified handling:
                    // We rely on visual for now or just skip if complex.
                    // But user wants "Feature check".
                    // Let's omit radical logic for fallback unless strictly needed to convert.

                    // Strokes
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

// Dedicated Stroke Renderer using HanziWriter
async function renderStrokeOrder(container, char) {
    if (!char) return;

    if (typeof HanziWriter === 'undefined') {
        console.error('❌ HanziWriter 未載入');
        container.innerHTML = '<span style="font-size:10px; color:red;">函式庫錯誤</span>';
        return;
    }

    console.log('🎨 開始渲染筆順 (HanziWriter):', char);

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
        container.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const f = document.createElement('div');
            f.className = 'stroke-step';
            f.innerHTML = `<span style="color:#ddd; font-size:12px;">${char}</span>`;
            container.appendChild(f);
        }
        return;
    }

    container.innerHTML = '';
    const displayCount = Math.min(strokeCount, 10);

    for (let i = 1; i <= displayCount; i++) {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'stroke-step';
        const writerId = `w-${Math.floor(Math.random() * 1000000)}`;
        stepDiv.id = writerId;
        container.appendChild(stepDiv);

        // Increased timeout to 50ms and added logging
        setTimeout(() => {
            const el = document.getElementById(writerId);
            if (!el) {
                console.warn('Stroke element not found:', writerId);
                return;
            }

            try {
                const writer = HanziWriter.create(writerId, char, {
                    width: 70,
                    height: 70,
                    padding: 5,
                    showOutline: false,
                    strokeColor: '#000000',
                    strokeAnimationSpeed: 10,
                    delayBetweenStrokes: 0
                });

                // Cumulative strokes logic
                for (let j = 0; j < i; j++) {
                    writer.showStroke(j);
                }
                console.log(`✅ 已渲染筆順步驟 ${i}: ${writerId}`);
            } catch (err) {
                console.error(`❌ HanziWriter 渲染失敗(${writerId}):`, err);
                el.innerHTML = `<span style="color:#ddd; font-size:12px;">${char}</span>`;
            }
        }, 50);
    }
}

