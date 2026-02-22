/**
 * offlineQueue.js — IndexedDB-backed queue for offline operation persistence.
 *
 * Pure JS module (no React). Stores pending API mutations that failed because
 * the backend was unreachable. SyncManager replays them when the server returns.
 *
 * DB:    'plis-offline-queue'
 * Store: 'ops'  (keyPath: 'id', autoIncrement: true)
 * Record shape: { id, path, method, body, timestamp, label }
 */

const DB_NAME = 'plis-offline-queue';
const STORE   = 'ops';
const VERSION = 1;

// Memoised open-connection promise — one IDB connection for the lifetime of the page.
let _dbPromise = null;

function openDB() {
    if (!window.indexedDB) {
        return Promise.reject(new Error('IndexedDB not available'));
    }
    if (_dbPromise) return _dbPromise;

    _dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, VERSION);

        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
        };

        req.onsuccess  = (e) => resolve(e.target.result);
        req.onerror    = (e) => { _dbPromise = null; reject(e.target.error); };
        req.onblocked  = ()  => { _dbPromise = null; reject(new Error('IDB blocked')); };
    });

    return _dbPromise;
}

/**
 * Add a new operation to the queue.
 * @param {string} path    - API path, e.g. '/logs'
 * @param {string} method  - HTTP method, e.g. 'POST'
 * @param {object|null} body - Request body object (will be JSON-stringified)
 * @param {string} label   - Human-readable description for the UI
 */
export async function enqueue(path, method, body, label) {
    let db;
    try {
        db = await openDB();
    } catch {
        // IDB unavailable (e.g. Safari private mode) — fail silently
        return;
    }

    return new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).add({
            path,
            method,
            body:      body != null ? JSON.stringify(body) : null,
            timestamp: Date.now(),
            label:     label || `${method} ${path}`,
        });
        tx.oncomplete = () => resolve(req.result);   // resolves with the new id
        tx.onerror    = (e) => reject(e.target.error);
    });
}

/**
 * Get all queued operations in insertion order (ascending by id).
 * @returns {Promise<Array>}
 */
export async function getAll() {
    let db;
    try {
        db = await openDB();
    } catch {
        return [];
    }

    return new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror   = (e) => reject(e.target.error);
    });
}

/**
 * Remove a single operation by its id (after successful replay).
 * @param {number} id
 */
export async function remove(id) {
    let db;
    try {
        db = await openDB();
    } catch {
        return;
    }

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror    = (e) => reject(e.target.error);
    });
}

/**
 * Return the number of pending operations.
 * @returns {Promise<number>}
 */
export async function count() {
    let db;
    try {
        db = await openDB();
    } catch {
        return 0;
    }

    return new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror   = (e) => reject(e.target.error);
    });
}
