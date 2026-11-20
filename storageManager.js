/**
 * storageManager.js
 * 負責管理 LocalStorage 的核心資料層
 * 
 * 結構：
 * {
 *   "profile": { "id": "default", "name": "寶貝" },
 *   "settings": {
 *     "grade": 1,
 *     "semester": "A",
 *     "lastOutputLesson": 0,
 *     "lastOutputAt": null,
 *     "paperSize": "A4",
 *     "directDownload": false,
 *     "updatedAt": "ISOString"
 *   },
 *   "history": [] 
 * }
 */

const STORAGE_KEY = "write_practice_data";
const TEACHING_PROGRESS_KEY = "write_practice_teaching_progress";

const DEFAULT_DATA = {
    profile: {
        id: "default",
        name: "寶貝"
    },
    settings: {
        grade: 1,
        semester: "A", // 上學期
        lastOutputLesson: 0,
        lastOutputAt: null,
        pinnedLesson: null, // v1.1: User manual selection
        paperSize: "A4",
        directDownload: false,
        updatedAt: new Date().toISOString()
    },
    history: []
};

class StorageManager {
    constructor() {
        this.data = null;
        this.init();
    }

    // 初始化：讀取或建立預設值
    init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                const { lastLesson, ...settings } = saved?.settings ?? {};
                this.data = {
                    ...DEFAULT_DATA,
                    ...saved,
                    // Older values could come from a preview. Retain the recommendation only.
                    settings: { ...DEFAULT_DATA.settings, lastOutputLesson: lastLesson ?? 0, ...settings },
                    profile: { ...DEFAULT_DATA.profile, ...saved?.profile },
                    history: Array.isArray(saved?.history) ? saved.history : []
                };
                console.log("✅ StorageManager: 資料載入成功", this.data);
            } else {
                this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
                // Do not save yet, wait for onboarding if needed
                console.log("✨ StorageManager: 建立預設資料 (待初始化)");
            }
        } catch (e) {
            console.error("❌ StorageManager Init Error:", e);
            // Fallback to default in memory if LS fails
            this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
    }

    save() {
        try {
            this.data.settings.updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error("❌ StorageManager Save Error:", e);
        }
    }

    // --- API ---

    getSettings() {
        return this.data.settings;
    }

    getProfile() {
        return this.data.profile;
    }

    getTeachingProgress() {
        try {
            const saved = JSON.parse(localStorage.getItem(TEACHING_PROGRESS_KEY));
            const progress = Array.isArray(saved?.records)
                ? saved.records.find(record => record && JSON.stringify([record.academicYear, record.publisher,
                    record.grade, record.semester, record.sourceVersion]) === saved.activeKey)
                : saved;
            return progress?.confirmed === true ? progress : null;
        } catch (e) {
            return null;
        }
    }

    resetWorksheetData() {
        localStorage.removeItem(STORAGE_KEY);
    }

    updateSettings(partialSettings) {
        this.data.settings = { ...this.data.settings, ...partialSettings };
        this.save();
        console.log("💾 Settings Updated:", this.data.settings);
    }

    // 記錄練習紙輸出，供首頁推薦使用。
    addHistory(lessonInfo) {
        const record = {
            ...lessonInfo,
            timestamp: new Date().toISOString()
        };
        // 只保留最近 50 筆
        this.data.history.unshift(record);
        if (this.data.history.length > 50) this.data.history.pop();

        this.updateSettings({
            lastOutputLesson: lessonInfo.lesson,
            lastOutputAt: record.timestamp,
            grade: lessonInfo.grade,
            semester: lessonInfo.semester,
            pinnedLesson: null // Clear pin after success
        });
    }

    // Check if first time
    isNewUser() {
        return !localStorage.getItem(STORAGE_KEY);
    }
}

// Singleton export
const storageManager = new StorageManager();
window.storageManager = storageManager; // Expose to window for easy access
