// JS for Vertical Stack Header + Real Stroke Rendering (cnchar)
const charactersInput = document.getElementById('characters');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewArea = document.getElementById('previewSection');
let renderedWorksheetLesson = null;

// --- LINE Visual Guide Injector ---
(function injectLineGuide() {
    const guideHtml = `
        <div id="lineGuide" class="line-guide-overlay">
            <div class="line-guide-content">
                <div class="line-guide-icon">💡</div>
                <div class="line-guide-title">使用 Safari / Chrome 開啟</div>
                <div class="line-guide-step">
                    <div class="step-number">1</div>
                    <div class="step-text">點擊右下角的 <b>「分享」</b> 按鈕 (或三個點)</div>
                </div>
                <div class="line-guide-step">
                    <div class="step-number">2</div>
                    <div class="step-text">選擇 <b>「在瀏覽器中開啟」</b> 或 <b>「使用 Safari 開啟」</b></div>
                </div>
                <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 1rem;">
                    LINE 內建瀏覽器限制較多，切換至系統瀏覽器即可正常列印與下載 PDF。
                </p>
                <button class="line-guide-close" onclick="document.getElementById('lineGuide').style.display='none'">我知道了</button>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = guideHtml;
    document.body.appendChild(div.firstElementChild);
})();

function showLineGuide() {
    const guide = document.getElementById('lineGuide');
    if (guide) guide.style.display = 'flex';
}

// --- Hybrid Print Mode Detector (v8.5) ---
(function detectPrintMode() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        document.body.classList.add('mobile-print-mode');
        console.log("📱 Mobile Print Mode Active");
    } else {
        document.body.classList.add('desktop-print-mode');
        console.log("💻 Desktop Print Mode Active");
    }
})();

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
// Init immediately when DOM loads
// --- Spec v1.1 Implementation Start ---
document.addEventListener('DOMContentLoaded', async () => {
    loadCharDatabase();

    const { openWorksheetHome } = await import('./worksheetHome.mjs');
    const home = await openWorksheetHome({
        prepare(text, metadata) {
            charactersInput.value = text;
            renderSheets(text, metadata);
        },
        clear() {
            if (renderedWorksheetLesson && charactersInput.value === renderedWorksheetLesson.text) {
                charactersInput.value = '';
            }
            renderedWorksheetLesson = null;
            document.getElementById('sheets-container').replaceChildren();
            document.getElementById('worksheetPreviewActions').hidden = true;
            previewArea.querySelector(':scope > .empty-state').hidden = false;
        }
    });
    if (home) return;

    // 0. Handle Onboarding (Spec v1.1)
    if (window.storageManager && window.storageManager.isNewUser()) {
        const modal = document.getElementById('onboardingModal');
        const startBtn = document.getElementById('obStartBtn');
        if (modal) {
            modal.style.display = 'flex';

            let selectedGrade = null;
            let selectedSem = null;

            // Auto-detect semester based on month (v1.1 Step 1.1)
            const month = new Date().getMonth() + 1;
            const defaultSem = (month >= 2 && month <= 6) ? 'B' : 'A';

            document.querySelectorAll('#obSemToggle .ob-btn').forEach(b => {
                if (b.dataset.value === defaultSem) {
                    b.classList.add('active');
                    selectedSem = defaultSem;
                }
                b.onclick = () => {
                    document.querySelectorAll('#obSemToggle .ob-btn').forEach(x => x.classList.remove('active'));
                    b.classList.add('active');
                    selectedSem = b.dataset.value;
                    checkValid();
                };
            });

            document.querySelectorAll('#obGradeGrid .ob-btn').forEach(b => {
                b.onclick = () => {
                    document.querySelectorAll('#obGradeGrid .ob-btn').forEach(x => x.classList.remove('active'));
                    b.classList.add('active');
                    selectedGrade = parseInt(b.dataset.value);
                    checkValid();
                };
            });

            function checkValid() {
                if (selectedGrade && selectedSem) startBtn.disabled = false;
            }

            startBtn.onclick = () => {
                window.storageManager.updateSettings({
                    grade: selectedGrade,
                    semester: selectedSem,
                    lastOutputLesson: 0,
                    pinnedLesson: null
                });
                modal.style.display = 'none';
                initApp(); // Start the app
            };
            return; // Stop here, initApp will be called by startBtn
        }
    }

    // Normal Start
    initApp();
});

function initApp() {
    const mainScript = () => {
        // 1. Init Storage
        const settings = window.storageManager.getSettings();

        // 2. Get Recommendation
        const rec = window.recommendationEngine.getRecommendation(settings);
        const smartCard = document.getElementById('smartCard');
        const heroTitle = document.getElementById('heroTitle');
        const heroSubTitle = document.getElementById('heroSubTitle');
        const heroActionBtn = document.getElementById('heroActionBtn');
        const cardLoading = document.querySelector('.card-loading');
        const cardContent = document.querySelector('.card-content');
        const legacyControls = document.getElementById('legacyControls');
        const toggleCustomBtn = document.getElementById('toggleCustomBtn');

        if (rec && smartCard) {
            console.log(`🎯 [Smart Core] 推薦: ${rec.grade}年級 ${rec.semester}學期 第${rec.lesson}課 (${rec.title})`);

            // v1.1 Platform Check (Updated: iOS Patch + Width Fallback)
            const isDesktopLike = (window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.innerWidth > 1024) && !isIOS();

            // UI Update (v1.1 Special Titles)
            let cleanTitle = rec.title ? rec.title.split('\n')[0] : "";

            if (rec.isNewSemester) {
                heroSubTitle.innerText = `康軒 113 學年度 · 準備開始 ${rec.grade} 年級${rec.semester === 'A' ? '上學期' : '下學期'}`;
                heroTitle.innerText = "✨ 新的開始";
                cleanTitle = "新的開始";
            } else {
                heroSubTitle.innerText = `康軒 113 學年度 · ${rec.grade} 年級${rec.semester === 'A' ? '上學期' : '下學期'}`;
                heroTitle.innerText = `第 ${rec.lesson} 課：${cleanTitle}`;
            }

            // Dynamic Hint Logic (Spec v1.1)
            const heroHint = document.querySelector('.hero-hint');
            if (heroHint) {
                let hintText = "已為您準備好練習紙";
                if (rec.isNewSemester) hintText = "準備下一學期的練習紙";
                else if (settings.pinnedLesson) hintText = "依你的選擇準備";
                else if (settings.lastOutputLesson > 0) hintText = `依上次選用的第 ${settings.lastOutputLesson} 課推薦`;
                else hintText = "從第一課開始練習";

                heroHint.innerHTML = `<span class="icon-shield">🛡</span> ${hintText}`;
            }

            // Show Content
            cardLoading.style.display = 'none';
            cardContent.style.display = 'block';

            // Bind Actions
            heroActionBtn.onclick = async () => {
                // 1. Load Vocab
                try {
                    // Check if data exists
                    if (!window.CURRICULUM_DATA) {
                        throw new Error("課綱資料未載入 (CURRICULUM_DATA)");
                    }

                    const gradeKey = rec.grade.toString();
                    const semKey = rec.semester;
                    const rawLessons = window.CURRICULUM_DATA[gradeKey]?.[semKey];

                    if (!rawLessons) {
                        throw new Error(`找不到該年級/學期的課程資料 (G${gradeKey}-${semKey})`);
                    }

                    const lessonData = rawLessons.find(l => l.lesson == rec.lesson);

                    if (lessonData && lessonData.vocab) {
                        const vocabStr = lessonData.vocab.join('');
                        charactersInput.value = vocabStr;

                        // 2. Render (This logic still depends on charDB/MOE_DATA which is fine)
                        renderSheets(vocabStr, {
                            grade: rec.grade,
                            semester: rec.semester,
                            lesson: rec.lesson,
                            title: lessonData.title.split('\n')[0]
                        });

                        // 3. UI Feedback: Success State (In-place replacement)
                        const cardContent = document.querySelector('.card-content');

                        // Save original content for "Back/Edit" functionality (optional enhancement for later)
                        // For now, simple swap
                        cardContent.innerHTML = `
                            <div class="success-state" style="animation: fadeIn 0.5s; padding: 2rem 0;">
                                <div style="font-size: 4rem; margin-bottom: 1.5rem;">✅</div>
                                <h2 class="hero-title" style="margin-bottom: 0.5rem; font-size: 2.2rem; color: var(--primary-sage);">練習簿已準備好</h2>
                                <p class="hero-subtitle" style="margin-bottom: 2.5rem; opacity: 0.8;">
                                    <!-- Hidden Metadata for PDF Filename Engine -->
                                    <span id="heroSubTitle" style="display:none;">${rec.grade}年級 ${rec.semester === 'A' ? '上學期' : '下學期'}</span>
                                    <span id="heroTitle" style="display:none;">第 ${rec.lesson} 課：${rec.title.split('\n')[0]}</span>
                                    
                                    第 ${rec.lesson} 課
                                </p>
                                
                                <div class="hero-actions" style="flex-direction: column; gap: 1rem; max-width: 320px; margin: 0 auto;">
                                    <button id="heroPrintBtn" class="btn-primary-hero" style="background-color: var(--text-dark); width: 100%;">
                                        <span class="icon">🖨️</span> 
                                        列印 / 儲存為 PDF
                                    </button>
                                    
                                    <div style="display: flex; gap: 10px; width: 100%;">
                                        <button onclick="location.reload()" class="btn-primary-hero" style="background-color: white; color: var(--text-dark); border: 2px solid #eee; flex: 1; font-size: 0.9rem;">
                                            明天再來
                                        </button>
                                        <button id="nextLessonBtn" class="btn-primary-hero" style="background-color: var(--primary-sage); flex: 1; font-size: 0.9rem;">
                                            下一課
                                        </button>
                                    </div>
                                    
                                    <button id="downloadPdfBtn" class="btn-text" style="margin-top: 1rem; font-size: 0.85rem; text-decoration: underline; ${!isDesktopLike ? 'display: none;' : ''}">
                                        或是下載 PDF 備份
                                    </button>

                                    <!-- Mobile Debug Toggle -->
                                    <div style="margin-top: 1.5rem; border-top: 1px dashed #eee; padding-top: 1rem;">
                                        <button id="debugToggleBtn" class="btn-text" style="font-size: 0.8rem; opacity: 0.5;">
                                            🔧 開啟列印除錯模式 (抓跳頁蟲)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;

                        // Bind Debug Toggle
                        const debugBtn = document.getElementById('debugToggleBtn');
                        if (debugBtn) {
                            debugBtn.onclick = () => {
                                const isDebug = document.body.classList.toggle('print-debug');
                                debugBtn.innerHTML = isDebug ? '✅ 已開啟除錯模式 (預覽將顯示紅框)' : '🔧 開啟列印除錯模式 (抓跳頁蟲)';
                                debugBtn.style.opacity = isDebug ? '1' : '0.5';
                                debugBtn.style.color = isDebug ? 'red' : 'inherit';
                            };
                        }

                        // Re-bind Print Button (v1.4 Unified Native Print)
                        const heroPrintBtn = document.getElementById('heroPrintBtn');
                        if (heroPrintBtn) {
                            heroPrintBtn.onclick = () => printWorksheet(heroPrintBtn);
                        }

                        // Re-bind Next Lesson (Spec v1.1)
                        const nextBtn = document.getElementById('nextLessonBtn');
                        if (nextBtn) {
                            nextBtn.onclick = () => {
                                // Update sequence to next lesson
                                window.storageManager.updateSettings({ pinnedLesson: rec.lesson + 1 });
                                location.reload();
                            };
                        }

                        // Re-bind Download Button (since we just created it)
                        document.getElementById('downloadPdfBtn').onclick = () => {
                            // Trigger hidden link
                            const mainDownloadBtn = document.getElementById('downloadBtn');
                            if (mainDownloadBtn) {
                                mainDownloadBtn.click();
                            } else {
                                alert("系統錯誤：找不到下載功能模組");
                            }
                        };

                        // Reveal "Edit" option below
                        const toggleBtn = document.getElementById('toggleCustomBtn');
                        if (toggleBtn) toggleBtn.innerText = "預覽 / 進階修改";

                    } else {
                        alert(`找不到這課的生字資料，請嘗試手動輸入。`);
                    }
                } catch (e) {
                    console.error("❌ Lesson Load Error:", e);
                    alert(`系統錯誤：${e.message}`);
                }
            };

            // Toggle Custom Controls
            if (toggleCustomBtn && legacyControls) {
                toggleCustomBtn.disabled = false;
                toggleCustomBtn.onclick = () => {
                    if (legacyControls.style.display === 'none') {
                        legacyControls.style.display = 'block';
                        toggleCustomBtn.innerHTML = '📂 收合自訂設定 (進階)';
                        legacyControls.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        legacyControls.style.display = 'none';
                        toggleCustomBtn.innerHTML = '想練習別課？前往自訂設定';
                    }
                }
            }

            // Dynamic Lesson Population
            const populateLessonSelect = () => {
                const activeGradeBtn = document.querySelector('.grade-card.active');
                const grade = activeGradeBtn ? parseInt(activeGradeBtn.dataset.value) : 1;

                const semesterSelect = document.getElementById('semesterSelect');
                const semester = semesterSelect ? semesterSelect.value : "A";

                const lessonSelect = document.getElementById('lessonSelect');
                if (!lessonSelect) return;

                // Save current selection to restore if possible
                const currentVal = parseInt(lessonSelect.value) || 1;

                // Clear existing
                lessonSelect.innerHTML = "";

                try {
                    const rawLessons = window.CURRICULUM_DATA[grade.toString()]?.[semester];
                    if (rawLessons && rawLessons.length > 0) {
                        // Filter duplicates (some lessons might be split, we usually want unique lesson numbers)
                        // Use Map to keep first occurrence or merge? 
                        // For dropdown, just unique Lesson IDs.
                        const uniqueLessons = new Map();
                        rawLessons.forEach(l => {
                            if (!uniqueLessons.has(l.lesson)) {
                                uniqueLessons.set(l.lesson, l.title.split('\n')[0]);
                            }
                        });

                        // Sort keys just in case
                        const sortedKeys = Array.from(uniqueLessons.keys()).sort((a, b) => a - b);

                        sortedKeys.forEach(lessonId => {
                            const title = uniqueLessons.get(lessonId);
                            const opt = document.createElement('option');
                            opt.value = lessonId;
                            opt.text = title.includes(`第 ${lessonId} 課`) ? title : `第 ${lessonId} 課：${title}`;
                            lessonSelect.appendChild(opt);
                        });

                        // Restore selection or default to 1 (or max)
                        if (sortedKeys.includes(currentVal)) {
                            lessonSelect.value = currentVal;
                        } else {
                            lessonSelect.value = sortedKeys[0];
                        }
                    } else {
                        // Fallback if no data
                        const opt = document.createElement('option');
                        opt.text = "無課程資料";
                        lessonSelect.appendChild(opt);
                    }
                } catch (e) {
                    console.error("Populate List Error", e);
                }
            };

            // Sync Logic: Legacy Controls -> Smart Card
            const updateHeroUI = () => {
                const activeGradeBtn = document.querySelector('.grade-card.active');
                if (activeGradeBtn) rec.grade = parseInt(activeGradeBtn.dataset.value);

                const semesterSelect = document.getElementById('semesterSelect');
                if (semesterSelect) rec.semester = semesterSelect.value;

                const lessonSelect = document.getElementById('lessonSelect');
                if (lessonSelect && lessonSelect.value) {
                    rec.lesson = parseInt(lessonSelect.value);
                    const selectedOption = lessonSelect.options[lessonSelect.selectedIndex];

                    // --- Sync Vocab to Input Box ---
                    const gradeKey = rec.grade.toString();
                    const semKey = rec.semester;
                    const lessonData = window.CURRICULUM_DATA[gradeKey]?.[semKey]?.find(l => l.lesson == rec.lesson);
                    if (lessonData && lessonData.vocab && charactersInput) {
                        charactersInput.value = lessonData.vocab.join('');
                    }

                    if (selectedOption) {
                        rec.title = selectedOption.text.split('：')[1] || selectedOption.text;
                    }
                } else {
                    rec.title = "無課程";
                }

                const hSub = document.getElementById('heroSubTitle');
                const hTitle = document.getElementById('heroTitle');
                if (hSub) hSub.innerText = `康軒 113 學年度 · ${rec.grade} 年級${rec.semester === 'A' ? '上學期' : '下學期'}`;
                if (hTitle) hTitle.innerText = `第 ${rec.lesson} 課：${rec.title}`;

                const isToday = settings.lastOutputAt && new Date(settings.lastOutputAt).toDateString() === new Date().toDateString();
                const isThisLesson = settings.grade === rec.grade && settings.semester === rec.semester && settings.lastOutputLesson === rec.lesson;
                const outputToday = isToday && isThisLesson;
                heroActionBtn.innerHTML = outputToday
                    ? '<span class="icon">✅</span> 今天已開啟輸出（可重印）'
                    : `<span class="icon">✨</span> 下載第 ${rec.lesson} 課練習簿 (10秒)`;
                heroActionBtn.style.backgroundColor = outputToday ? 'var(--text-dark)' : 'var(--primary-sage)';
            };

            // Attach Listeners for Sync
            document.querySelectorAll('.grade-card').forEach(card => card.addEventListener('click', function () {
                if (this.classList.contains('disabled')) return;

                // Toggle active
                document.querySelectorAll('.grade-card').forEach(c => c.classList.remove('active'));
                this.classList.add('active');

                // Sync
                setTimeout(() => {
                    populateLessonSelect();
                    updateHeroUI();
                }, 100);
            }));

            const semSel = document.getElementById('semesterSelect');
            if (semSel) semSel.addEventListener('change', () => {
                populateLessonSelect();
                updateHeroUI();
            });

            const lesSel = document.getElementById('lessonSelect');
            if (lesSel) lesSel.addEventListener('change', updateHeroUI);

            // Initial Population based on Recommendation
            // Wait for initial render? 
            // Better: update inputs to match 'rec' then populate
            // But we can do a lazy init:
            if (rec) {
                // Set legacy controls to match rec
                document.querySelectorAll('.grade-card').forEach(b => {
                    if (parseInt(b.dataset.value) == rec.grade) b.classList.add('active');
                    else b.classList.remove('active');
                });
                if (semSel) semSel.value = rec.semester;
                // Then populate
                populateLessonSelect();
                // Then set Lesson
                if (lesSel) lesSel.value = rec.lesson;
                // Double check UI
                updateHeroUI();
            }

            // Bind Reset App (v1.1)
            const resetBtn = document.getElementById('resetAppBtn');
            if (resetBtn) {
                resetBtn.onclick = () => {
                    if (confirm("確定要重設練習紙設定與輸出紀錄嗎？")) {
                        window.storageManager.resetWorksheetData();
                        location.reload();
                    }
                };
            }

        } else {
            // Fallback: No recommendation? Show manual controls
            if (legacyControls) legacyControls.classList.add('show-controls');
        }
    }; // Close mainScript
    mainScript();
}

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

    // v1.1 Custom Screen behavior: update pinnedLesson
    const lesSel = document.getElementById('lessonSelect');
    if (lesSel && window.storageManager && document.getElementById('currentWorksheet').hidden) {
        window.storageManager.updateSettings({ pinnedLesson: parseInt(lesSel.value) });
    }

    renderSheets(text);
});

// v1.1 iOS State
let iosBlobUrl = null;

// v1.1 PDF Blob Cache for Success Screen
let cachedPdfBlob = null;
let cachedPdfFilename = "生字練習簿.pdf";

// v1.1 Robust iOS Check
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function recordWorksheetOutput(lesson) {
    if (lesson && !lesson.academicYear) {
        const { text, ...metadata } = lesson;
        window.storageManager?.addHistory(metadata);
    }
}

function worksheetTitle(lesson) {
    if (!lesson) return '生字練習簿';
    const publisher = lesson.academicYear ? `${lesson.publisher}-${lesson.academicYear}學年度` : '康軒';
    const name = lesson.title ? `-${lesson.title}` : '';
    return `${publisher}-${lesson.grade}年級-${lesson.semester === 'A' ? '上' : '下'}-第${lesson.lesson}課${name}`
        .replace(/[\\/:*?"<>|\r\n]/g, '-');
}

function printWorksheet(button) {
    const page = document.querySelector('.sheet-page');
    if (!page) return;
    if (/Line\//i.test(navigator.userAgent)) showLineGuide();
    const originalContent = button.innerHTML;
    const originalTitle = document.title;
    const lesson = renderedWorksheetLesson;
    button.textContent = '準備列印…';
    button.disabled = true;
    document.title = worksheetTitle(lesson);
    document.body.classList.add('is-printing-now');
    setTimeout(() => {
        try {
            if (page.isConnected) {
                recordWorksheetOutput(lesson);
                window.print();
            }
        } finally {
            setTimeout(() => {
                document.body.classList.remove('is-printing-now');
                document.title = originalTitle;
                button.innerHTML = originalContent;
                button.disabled = false;
            }, 1500);
        }
    }, 400);
}

const worksheetPrint = document.getElementById('worksheetPrint');
worksheetPrint.addEventListener('click', () => printWorksheet(worksheetPrint));
document.getElementById('worksheetPdf').addEventListener('click', () => downloadBtn.click());

downloadBtn.addEventListener('click', async () => {
    const pages = document.querySelectorAll('.sheet-page');
    if (pages.length === 0) {
        alert('請先產生練習簿');
        return;
    }
    const outputLesson = renderedWorksheetLesson;
    const isMobile = isIOS() || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // v1.1 Mobile Strategy (v1.4 Updated to Native Print for all mobile)
    if (isMobile) {
        console.log('[Main] Mobile detected, triggering window.print()');
        recordWorksheetOutput(outputLesson);
        window.print();
        return;
    }
    // Check libraries
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert("PDF 函式庫尚未載入，請稍候再試。");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait, Millimeters, A4
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Show Loading State
    const originalText = downloadBtn.innerText;
    downloadBtn.innerText = "⏳ 轉檔中...";
    downloadBtn.disabled = true;
    const worksheetPdf = document.getElementById('worksheetPdf');
    const controls = document.getElementById('currentWorksheet').hidden ? []
        : [worksheetPdf, worksheetPrint, generateBtn, document.getElementById('worksheetLesson'),
            document.getElementById('prepareWorksheet')].filter(control => !control.disabled);
    for (const control of controls) control.disabled = true;

    // FORCE VISIBILITY for html2canvas
    const legacyControls = document.getElementById('legacyControls');
    const wasHidden = legacyControls && getComputedStyle(legacyControls).display === 'none';

    if (wasHidden) {
        // Temporarily reveal but keep off-screen/transparent if preferred, 
        // but 'block' is safest logic. 
        // User might see a flash, but better than broken PDF.
        legacyControls.classList.add('show-controls');
        // Optional: legacyControls.style.opacity = '0'; // If we wanted to hide the flash
    }

    try {
        const totalPages = pages.length;
        const visibleDownloadBtn = document.getElementById('downloadPdfBtn') ?? worksheetPdf;

        for (let i = 0; i < totalPages; i++) {
            const progressText = `⏳ 轉檔中 (${i + 1}/${totalPages})...`;
            downloadBtn.innerText = progressText;
            if (visibleDownloadBtn) visibleDownloadBtn.innerText = progressText;

            if (i > 0) doc.addPage();

            const page = pages[i];

            // Keep the responsive preview from narrowing the A4 capture.
            const canvas = await html2canvas(page, {
                scale: 2, // Retain quality
                allowTaint: true, // CRITICAL: Allow cross-origin resources
                logging: false,
                windowWidth: Math.max(window.innerWidth, 1024),
                onclone(_document, sheet) {
                    sheet.style.width = 'var(--a4-width)';
                    sheet.style.minWidth = 'var(--a4-width)';
                }
            });

            // Use toBlob instead of toDataURL to avoid security errors
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            });

            const imgData = URL.createObjectURL(blob);
            try {
                const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
                const width = canvas.width * scale;
                const height = canvas.height * scale;
                doc.addImage(imgData, 'JPEG', (pageWidth - width) / 2, 0, width, height);
            } finally {
                URL.revokeObjectURL(imgData);
            }
        }

        // Construct dynamic filename
        const filename = `${worksheetTitle(outputLesson)}.pdf`;

        if (isMobile) {
            // Mobile Strategy: Handled by window.print() at start
            return;
        }

        if (!pages[0].isConnected) return;
        doc.save(filename);
        recordWorksheetOutput(outputLesson);

        // Cache PDF Blob for Success Screen download
        cachedPdfBlob = doc.output('blob');
        cachedPdfFilename = filename;
        console.log('[PDF] Blob cached for Success Screen, filename:', filename);
    } catch (err) {
        console.error("PDF Fail:", err);
        console.error("PDF Error name:", err.name);
        console.error("PDF Error message:", err.message);
        console.warn("PDF generation failed, but this should not block user flow");

        // CRITICAL: Show error to user
        alert(`PDF 生成失敗\n\n錯誤: ${err.message}\n\n請截圖此訊息並回報`);
    } finally {
        downloadBtn.innerText = originalText;
        downloadBtn.disabled = false;

        const visibleBtn = document.getElementById('downloadPdfBtn');
        if (visibleBtn) visibleBtn.innerText = "或是下載 PDF 備份";
        worksheetPdf.innerText = '下載 PDF';
        for (const control of controls) control.disabled = false;

        // RESTORE VISIBILITY
        if (wasHidden && legacyControls) {
            legacyControls.classList.remove('show-controls');
        }
    }
});

function renderSheets(text, metadata = null) {
    renderedWorksheetLesson = null;
    let container = document.getElementById('sheets-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'sheets-container';
        previewArea.appendChild(container); // Reset
    }
    // v1.5 Sanitization: Remove all whitespace/newlines before counting pages
    const cleanText = text.toString().replace(/\s+/g, '');
    if (!cleanText) {
        container.innerHTML = '<div class="empty-state">請輸入文字內容</div>';
        return;
    }

    const chars = Array.from(cleanText);
    const totalPages = Math.ceil(chars.length / CHARS_PER_PAGE);

    container.innerHTML = ''; // Clear only after sanitization check

    for (let i = 0; i < totalPages; i++) {
        const pageChars = chars.slice(i * CHARS_PER_PAGE, (i + 1) * CHARS_PER_PAGE);
        const pageDOM = createPage(pageChars, metadata);
        container.appendChild(pageDOM);
    }
    renderedWorksheetLesson = metadata ? { ...metadata, text: cleanText } : null;
    if (!document.getElementById('currentWorksheet').hidden) {
        previewArea.querySelector(':scope > .empty-state').hidden = true;
        document.getElementById('worksheetPreviewActions').hidden = false;
        document.getElementById('worksheetPdf').hidden = isIOS() || /Android/i.test(navigator.userAgent);
    }
    // Enable Download (Force update)
    if (downloadBtn) {
        console.log("✅ Enabling Download Button...");
        setTimeout(() => {
            downloadBtn.removeAttribute('disabled');
            downloadBtn.disabled = false;
        }, 100);
    }

    // ✅ 移除「練習簿預覽」標題
    removePreviewHeader();
}

// ✅ 移除預覽區標題的函數
function removePreviewHeader() {
    const h = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .find(el => el.textContent.trim() === '練習簿預覽');
    if (h) {
        console.log('✅ 已移除「練習簿預覽」標題');
        h.remove();
    }
}

function createPage(chars, metadata = null) {
    const page = document.createElement('div');
    page.className = 'sheet-page';

    // 0. Page Header (Metadata Block v1.6) - 已移除以修正排版問題
    /*
    if (metadata) {
        const header = document.createElement('div');
        header.className = 'sheet-header';
        header.innerHTML = `
            <div class="sheet-title-main">生字練習簿</div>
            <div class="sheet-info-meta">
                康軒版 | ${metadata.grade}年級${metadata.semester === 'A' ? '上' : '下'} | 第${metadata.lesson}課：${metadata.title}
            </div>
            <div class="sheet-info-student">姓名：__________</div>
        `;
        page.appendChild(header);
    }
    */

    // Wrap Sidebar and Content in a Body Container
    const pageBody = document.createElement('div');
    pageBody.className = 'sheet-body';
    page.appendChild(pageBody);

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
    pageBody.appendChild(sidebar);

    // 2. Content
    const content = document.createElement('div');
    content.className = 'content-area';
    pageBody.appendChild(content);

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
        // 1. Fetch RAW Data using HanziWriter (MIT License - 可商業使用)
        if (typeof HanziWriter === 'undefined') {
            throw new Error('HanziWriter not loaded');
        }

        // ✅ 使用 HanziWriter (MIT License - 完全開放,可商業使用)
        const charData = await HanziWriter.loadCharacterData(char);
        console.log(`✅ 使用 HanziWriter 筆順資料: ${char}`);
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

            // Build SVG String
            const svgString = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
                    <g transform="scale(1, -1) translate(0, -900)">
                        ${strokes.slice(0, step + 1).map(path => `<path d="${path}" fill="#000000" />`).join('')}
                    </g>
                </svg>
            `.trim();

            // Convert to Atomic Image (Prevents print engines from "exploding" the SVG internal paths)
            const img = document.createElement('img');
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.display = 'block';

            stepDiv.appendChild(img);
            container.appendChild(stepDiv);
        }

    } catch (e) {
        console.error("❌ 筆順資料加載失敗:", e);
        container.innerHTML = `<span style="color:red; font-size:10px;">渲染失敗</span>`;
    }
}

