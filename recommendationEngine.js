/**
 * recommendationEngine.js
 * 負責決定首頁「Hero 區」該顯示哪一課 (The Brain)
 * 
 * 核心原則：
 * 1. 預設 > 選擇
 * 2. Target = lastLesson + 1
 */

class RecommendationEngine {
    constructor() {
        // Dependency: Needs access to curriculum data structure
        // 假設 CURRICULUM_DATA 已載入 (from curriculum_data.js)
    }

    /**
     * 計算推薦課程
     * @param {Object} settings - from storageManager.getSettings()
     * @returns {Object} { grade, semester, lesson, title, reason }
     */
    getRecommendation(settings) {
        // 防呆：如果尚未載入課綱資料
        if (typeof window.CURRICULUM_DATA === 'undefined') {
            console.warn("⚠️ RecommendationEngine: 課綱資料尚未載入 (CURRICULUM_DATA missing)");
            return null;
        }

        const currentGrade = settings.grade || 1;
        const currentSem = settings.semester || "A";
        const lastLesson = settings.lastLesson || 0;

        let targetGrade = currentGrade;
        let targetSem = currentSem;
        let targetLesson = lastLesson + 1;
        let reason = "continue"; // continue, new-start, semester-end

        // 1. 新手判斷
        if (lastLesson === 0) {
            targetLesson = 1;
            reason = "new-start";
        }

        // 2. 邊界檢查 (是否超過該學期總課數)
        // 取得該年級學期的課程列表
        // CURRICULUM_DATA 結構: { "1": { "A": [lessons...], "B": [...] } }
        const gradeData = window.CURRICULUM_DATA[targetGrade.toString()];

        if (gradeData && gradeData[targetSem]) {
            const lessons = gradeData[targetSem];

            // Fix: Calculate actual max lesson ID (robust against duplicates/gaps)
            const maxLessonId = lessons.reduce((max, l) => l.lesson > max ? l.lesson : max, 0);

            if (targetLesson > maxLessonId) {
                // 超過該學期範圍
                console.log(`ℹ️ 學期結束判斷: ${targetGrade}${targetSem} 只有 ${maxLessonId} 課, 目標 ${targetLesson}`);

                // TODO: 這裡可以做更聰明的學期切換 (A -> B, B -> Grade+1 A)
                // 目前 MVP 策略：停在最後一課
                targetLesson = maxLessonId;
                reason = "semester-end";
            }
        } else {
            // 資料異常 fallback
            console.warn("⚠️ RecommendationEngine: 資料異常，找不到對應年級課綱");
            targetLesson = 1;
        }

        // 3. 取得 Lesson Title 
        let lessonTitle = "";
        let lessonVocab = [];

        try {
            const lessonData = window.CURRICULUM_DATA[targetGrade.toString()][targetSem].find(l => l.lesson == targetLesson);
            if (lessonData) {
                lessonTitle = lessonData.title.split('\n')[0]; // 取第一行標題
                lessonVocab = lessonData.vocab;
            }
        } catch (e) {
            console.error("❌ RecommendationEngine Error getting title:", e);
        }

        const result = {
            grade: targetGrade,
            semester: targetSem,
            lesson: targetLesson,
            title: lessonTitle,
            vocabCount: lessonVocab.length,
            reason: reason
        };

        console.log("🎯 Recommendation:", result);
        return result;
    }
}

const recommendationEngine = new RecommendationEngine();
window.recommendationEngine = recommendationEngine;
