/**
 * Curriculum Selector Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const gradeSelect = document.getElementById('gradeSelect');
    const semesterSelect = document.getElementById('semesterSelect');
    const lessonSelect = document.getElementById('lessonSelect');
    const loadBtn = document.getElementById('loadCurriculumBtn');
    const charsInput = document.getElementById('characters');

    // 1. Initialize Lessons Dropdown
    function updateLessons() {
        const grade = gradeSelect.value;
        const semester = semesterSelect.value;

        lessonSelect.innerHTML = '';

        if (CURRICULUM_KANGHSUAN.structure[grade] &&
            CURRICULUM_KANGHSUAN.structure[grade][semester]) {

            const lessons = CURRICULUM_KANGHSUAN.structure[grade][semester];

            if (lessons.length === 0) {
                const opt = document.createElement('option');
                opt.textContent = '暫無資料';
                lessonSelect.appendChild(opt);
                loadBtn.disabled = true;
                return;
            }

            loadBtn.disabled = false;
            lessons.forEach(l => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(l.vocab);
                opt.textContent = `第 ${l.lesson} 課: ${l.title}`;
                lessonSelect.appendChild(opt);
            });
        }
    }

    // 2. Event Listeners
    // gradeSelect.addEventListener('change', updateLessons); // Removed: Hidden Input doesn't fire change on programmatic update

    // New: Grade Card Logic
    const gradeCards = document.querySelectorAll('.grade-card');
    gradeCards.forEach(card => {
        card.addEventListener('click', () => {
            // Visual Update
            gradeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Data Update
            const val = card.getAttribute('data-value');
            gradeSelect.value = val;

            // Trigger Logic
            updateLessons();
        });
    });

    semesterSelect.addEventListener('change', updateLessons);

    loadBtn.addEventListener('click', () => {
        if (!lessonSelect.value) return;

        const vocab = JSON.parse(lessonSelect.value);
        const vocabStr = vocab.join('');

        // Update input box
        charsInput.value = vocabStr;

        // Trigger manual generation
        document.getElementById('generateBtn').click();
    });

    // 3. Initial Load
    updateLessons();
});
