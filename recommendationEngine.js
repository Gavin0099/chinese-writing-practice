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

        const gradeData = window.CURRICULUM_DATA[targetGrade.toString()];

        if (gradeData && gradeData[targetSem]) {
            const lessons = gradeData[targetSem];
            const maxLessonId = lessons.reduce((max, l) => l.lesson > max ? l.lesson : max, 0);

            if (targetLesson > maxLessonId) {
                // 超過該學期範圍 -> 嘗試切換學期
                if (targetSem === 'A' && gradeData['B']) {
                    targetSem = 'B';
                    targetLesson = 1;
                    reason = "semester-jump";
                    console.log(`🚀 進度跳轉: ${targetGrade}A 結束，自動前往 ${targetGrade}B 第 1 課`);
                } else {
                    // 如果 B 也結束了，或者目前就是 B
                    // 檢查是否有下一學年？
                    const nextGrade = (parseInt(targetGrade) + 1).toString();
                    if (window.CURRICULUM_DATA[nextGrade]) {
                        targetGrade = nextGrade;
                        targetSem = 'A';
                        targetLesson = 1;
                        reason = "grade-jump";
                        console.log(`🎓 升年級跳轉: ${targetGrade - 1} 年級結束，前往 ${targetGrade} 年級 1A`);
                    } else {
                        // 都沒了，停留在原點最後一課
                        targetLesson = maxLessonId;
                        reason = "all-finished";
                    }
                }
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
