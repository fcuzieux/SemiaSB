/**
 * capture-storage.js
 * Gère la persistance des chunks de vidéo dans IndexedDB pour éviter les pertes en cas de crash.
 */

const CaptureStorage = {
    DB_NAME: "SemiaSB_Capture",
    STORE_NAME: "chunks",
    SETTINGS_STORE: "settings",
    DB_VERSION: 2,
    db: null,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
                    db.createObjectStore(this.SETTINGS_STORE);
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => reject("Erreur IndexedDB: " + e.target.error);
        });
    },

    async saveChunk(chunk) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], "readwrite");
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.add(chunk);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getAllChunks() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], "readonly");
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async clear() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], "readwrite");
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async hasData() {
        const chunks = await this.getAllChunks();
        return chunks.length > 0;
    },

    // --- Gestion du Directory Handle (File System Access API) ---
    async saveHandle(key, handle) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.SETTINGS_STORE], "readwrite");
            const store = transaction.objectStore(this.SETTINGS_STORE);
            const request = store.put(handle, key);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getHandle(key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.SETTINGS_STORE], "readonly");
            const store = transaction.objectStore(this.SETTINGS_STORE);
            const request = store.get(key);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

window.CaptureStorage = CaptureStorage;
