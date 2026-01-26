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
 *     "lastLesson": 0,
 *     "paperSize": "A4",
 *     "directDownload": false,
 *     "updatedAt": "ISOString"
 *   },
 *   "history": [] 
 * }
 */

const STORAGE_KEY = "write_practice_data";

const DEFAULT_DATA = {
    profile: {
        id: "default",
        name: "寶貝"
    },
    settings: {
        grade: 1,
        semester: "A", // 上學期
        lastLesson: 0, // 0 代表尚未開始
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
                this.data = JSON.parse(raw);
                // 簡單的 Schema 檢查，若缺少 key 則補上預設值 (Migration 概念)
                this.data = { ...DEFAULT_DATA, ...this.data };
                this.data.settings = { ...DEFAULT_DATA.settings, ...this.data.settings };
                this.data.profile = { ...DEFAULT_DATA.profile, ...this.data.profile };
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

    updateSettings(partialSettings) {
        this.data.settings = { ...this.data.settings, ...partialSettings };
        this.save();
        console.log("💾 Settings Updated:", this.data.settings);
    }

    // 紀錄下載歷史
    addHistory(lessonInfo) {
        const record = {
            timestamp: new Date().toISOString(),
            ...lessonInfo // { grade, semester, lesson, title }
        };
        // 只保留最近 50 筆
        this.data.history.unshift(record);
        if (this.data.history.length > 50) this.data.history.pop();

        // v1.1 Success Rule:
        // onSuccess() {
        //   profile.lastLessonDownloaded = current.lesson;
        //   profile.pinnedLesson = null;
        // }
        this.updateSettings({
            lastLesson: lessonInfo.lesson,
            grade: lessonInfo.grade,
            semester: lessonInfo.semester,
            pinnedLesson: null // Clear pin after success
        });

        this.save();
    }

    // Check if first time
    isNewUser() {
        return !localStorage.getItem(STORAGE_KEY);
    }
}

// Singleton export
const storageManager = new StorageManager();
window.storageManager = storageManager; // Expose to window for easy access
