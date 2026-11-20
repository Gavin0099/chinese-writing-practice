/**
 * recommendationEngine.js
 * 負責決定首頁「Hero 區」該顯示哪一課 (The Brain)
 * 
 * 核心原則：
 * 1. 預設 > 選擇
 * 2. 從上次輸出的練習紙推薦下一課
 */

class RecommendationEngine {
    constructor() {
        // Dependency: Needs access to curriculum data structure
        // 假設 CURRICULUM_DATA 已載入 (from curriculum_data.js)
    }

    /**
     * 計算推薦課程 (v1.1 精準版)
     * @param {Object} settings - from storageManager.getSettings()
     * @returns {Object} { grade, semester, lesson, title, reason, isNewSemester }
     */
    getRecommendation(settings) {
        if (typeof window.CURRICULUM_DATA === 'undefined') {
            console.warn("⚠️ RecommendationEngine: 課綱資料尚未載入");
            return null;
        }

        const grade = settings.grade || 1;
        const semester = settings.semester || "A";
        const lastOutputLesson = settings.lastOutputLesson || 0;
        const pinnedLesson = settings.pinnedLesson;

        // 1. Pinned Lesson 優先 (v1.1 核心原則)
        if (pinnedLesson) {
            return this._formatResult(grade, semester, pinnedLesson, "pinned", false);
        }

        // 2. 獲取該學期有效課次清單
        const gradeData = window.CURRICULUM_DATA[grade.toString()];
        if (!gradeData || !gradeData[semester]) {
            return this._formatResult(grade, semester, 1, "fallback", false);
        }

        const lessons = gradeData[semester].map(l => l.lesson).sort((a, b) => a - b);

        // 3. 找出下一個目標
        // 如果從未下載，從第一課開始
        if (lastOutputLesson === 0) {
            return this._formatResult(grade, semester, lessons[0] || 1, "new-start", false);
        }

        const currentIndex = lessons.indexOf(lastOutputLesson);

        // 情況 A: 還有下一課
        if (currentIndex >= 0 && currentIndex + 1 < lessons.length) {
            return this._formatResult(grade, semester, lessons[currentIndex + 1], "continue", false);
        }

        // 情況 B: 這一學期結束了 -> 嘗試跨學期
        if (semester === "A" && gradeData["B"]) {
            return this._formatResult(grade, "B", 1, "semester-jump", true);
        }

        // 情況 C: 這一年級結束了 -> 嘗試跨年級
        const nextGrade = (parseInt(grade) + 1).toString();
        if (window.CURRICULUM_DATA[nextGrade]) {
            return this._formatResult(nextGrade, "A", 1, "grade-jump", true);
        }

        // 情況 D: 全數完成
        return this._formatResult(grade, semester, lastOutputLesson, "all-finished", false);
    }

    _formatResult(grade, semester, lesson, reason, isNewSemester) {
        let title = "";
        try {
            const lessonData = window.CURRICULUM_DATA[grade.toString()][semester].find(l => l.lesson == lesson);
            if (lessonData) title = lessonData.title.split('\n')[0];
        } catch (e) { }

        return {
            grade: parseInt(grade),
            semester: semester,
            lesson: lesson,
            title: title,
            reason: reason,
            isNewSemester: isNewSemester
        };
    }
}

const recommendationEngine = new RecommendationEngine();
window.recommendationEngine = recommendationEngine;
