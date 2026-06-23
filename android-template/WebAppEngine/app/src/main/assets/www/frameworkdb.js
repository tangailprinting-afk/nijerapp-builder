const FRAMEWORK_DB_PREFIX = 'sds_fallback_';
const EXTERNAL_FRAMEWORK_API = window.frameworkAPI || null;

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAx9qZd5m8ENs8plt4WDpAo8C2pL55j0d8",
    authDomain: "limon-95484.firebaseapp.com",
    databaseURL: "https://limon-95484-default-rtdb.firebaseio.com",
    projectId: "limon-95484",
    storageBucket: "limon-95484.firebasestorage.app",
    messagingSenderId: "220861816290",
    appId: "1:220861816290:web:6fa84fb77a40f035222dbb",
    measurementId: "G-7WN2G7JQKJ"
};

const FIREBASE_SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.5/';
const FIREBASE_SESSION_KEY = 'sds_firebase_session';
const APP_SESSION_KEY = 'myframework_current_user';
const COLLECTION_CACHE_PREFIX = 'sds_collection_cache_';
const COLLECTION_CACHE_DB_NAME = 'sds_collection_cache_db';
const COLLECTION_CACHE_DB_VERSION = 1;
const COLLECTION_CACHE_STORE = 'collections';
const FIREBASE_RETRY_COOLDOWN_MS = 120000;

const collectionMemoryCache = new Map();
let collectionCacheDbPromise = null;
let firebaseReadyPromise = null;
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseDisabledUntil = 0;
let firebaseLastError = null;

function getNativeBridge() {
    return EXTERNAL_FRAMEWORK_API ||
        window.sqliteBridge ||
        window.AndroidSQLiteBridge ||
        window.NativeSQLiteBridge ||
        null;
}

function isLoginPage() {
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    return page === 'login.html';
}

function readStore(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getCollectionKey(collection) {
    return `${FRAMEWORK_DB_PREFIX}${collection}`;
}

function getConfigFallback() {
    return readStore(`${FRAMEWORK_DB_PREFIX}config`, null);
}

function saveConfigFallback(data) {
    writeStore(`${FRAMEWORK_DB_PREFIX}config`, data || {});
    return data;
}

function loadCollection(collection) {
    const data = readStore(getCollectionKey(collection), []);
    return Array.isArray(data) ? data : [];
}

function saveCollection(collection, rows) {
    writeStore(getCollectionKey(collection), rows);
}

function getCollectionCacheKey(collection) {
    return `${COLLECTION_CACHE_PREFIX}${collection}`;
}

function hasIndexedDB() {
    return typeof indexedDB !== 'undefined' && !!indexedDB.open;
}

function isOnlineNow() {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
}

function canAttemptFirebase() {
    return isOnlineNow() && Date.now() >= firebaseDisabledUntil;
}

function disableFirebaseTemporarily(error, cooldownMs = FIREBASE_RETRY_COOLDOWN_MS) {
    firebaseLastError = error instanceof Error ? error : new Error(String(error || 'Firebase unavailable'));
    firebaseDisabledUntil = Date.now() + cooldownMs;
    firebaseReadyPromise = null;
}

function enableFirebaseAgain() {
    firebaseLastError = null;
    firebaseDisabledUntil = 0;
}

function cloneRows(rows) {
    return (Array.isArray(rows) ? rows : []).map(row => ({ ...row }));
}

function flattenFallbackRows(rows) {
    return (Array.isArray(rows) ? rows : []).map(row => ({
        id: row?.id,
        ...(row && typeof row.data === 'object' ? row.data : {}),
    }));
}

function normalizeCollectionRows(rows) {
    return cloneRows((Array.isArray(rows) ? rows : []).map(row => ({
        ...row,
        id: row?.id,
    })));
}

async function readMutableRows(collection) {
    const cached = await readCollectionCache(collection);
    if (cached) return normalizeCollectionRows(cached);
    return normalizeCollectionRows(flattenFallbackRows(loadCollection(collection)));
}

async function persistMutableRows(collection, rows) {
    const data = normalizeCollectionRows(rows);
    await writeCollectionCache(collection, data);
    return data;
}

async function upsertMutableRow(collection, row) {
    const rows = await readMutableRows(collection);
    const id = row?.id;
    const nextRows = rows.slice();
    const index = nextRows.findIndex(r => r.id == id);
    const normalized = { ...row, id };
    if (index >= 0) {
        nextRows[index] = normalized;
    } else {
        nextRows.push(normalized);
    }
    await persistMutableRows(collection, nextRows);
    return nextRows;
}

async function deleteMutableRow(collection, id) {
    const rows = await readMutableRows(collection);
    const nextRows = rows.filter(row => row.id != id);
    await persistMutableRows(collection, nextRows);
    return nextRows;
}

async function openCollectionCacheDb() {
    if (!hasIndexedDB()) return null;
    if (!collectionCacheDbPromise) {
        collectionCacheDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(COLLECTION_CACHE_DB_NAME, COLLECTION_CACHE_DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(COLLECTION_CACHE_STORE)) {
                    db.createObjectStore(COLLECTION_CACHE_STORE, { keyPath: 'key' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB cache unavailable'));
        }).catch((error) => {
            collectionCacheDbPromise = null;
            throw error;
        });
    }
    return collectionCacheDbPromise;
}

async function idbGetCollectionCache(collection) {
    const db = await openCollectionCacheDb();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
        const tx = db.transaction(COLLECTION_CACHE_STORE, 'readonly');
        const store = tx.objectStore(COLLECTION_CACHE_STORE);
        const req = store.get(getCollectionCacheKey(collection));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('IndexedDB cache read failed'));
    });
}

async function idbSetCollectionCache(collection, data) {
    const db = await openCollectionCacheDb();
    if (!db) return false;
    await new Promise((resolve, reject) => {
        const tx = db.transaction(COLLECTION_CACHE_STORE, 'readwrite');
        const store = tx.objectStore(COLLECTION_CACHE_STORE);
        store.put({ key: getCollectionCacheKey(collection), data: cloneRows(data) });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IndexedDB cache write failed'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB cache write failed'));
    });
    return true;
}

async function idbDeleteCollectionCache(collection) {
    const db = await openCollectionCacheDb();
    if (!db) return false;
    await new Promise((resolve, reject) => {
        const tx = db.transaction(COLLECTION_CACHE_STORE, 'readwrite');
        const store = tx.objectStore(COLLECTION_CACHE_STORE);
        store.delete(getCollectionCacheKey(collection));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IndexedDB cache delete failed'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB cache delete failed'));
    });
    return true;
}

async function readCollectionCache(collection) {
    if (collectionMemoryCache.has(collection)) {
        return cloneRows(collectionMemoryCache.get(collection));
    }

    try {
        const cached = await idbGetCollectionCache(collection);
        if (!cached || !Array.isArray(cached.data)) return null;

        collectionMemoryCache.set(collection, cached.data);
        return cloneRows(cached.data);
    } catch (e) {
        try {
            const raw = localStorage.getItem(getCollectionCacheKey(collection));
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.data)) return null;

            collectionMemoryCache.set(collection, parsed.data);
            return cloneRows(parsed.data);
        } catch (fallbackError) {
            return null;
        }
    }
}

async function writeCollectionCache(collection, rows) {
    const data = cloneRows(rows);
    collectionMemoryCache.set(collection, data);
    try {
        await idbSetCollectionCache(collection, data);
    } catch (e) {
        try {
            localStorage.setItem(getCollectionCacheKey(collection), JSON.stringify({ data }));
        } catch (fallbackError) {}
    }
}

async function invalidateCollectionCache(collection) {
    collectionMemoryCache.delete(collection);
    try {
        await idbDeleteCollectionCache(collection);
    } catch (e) {
        try {
            localStorage.removeItem(getCollectionCacheKey(collection));
        } catch (fallbackError) {}
    }
}

async function invalidateCollectionCaches(collections) {
    const list = Array.isArray(collections) ? collections : [collections];
    await Promise.all(list.map(invalidateCollectionCache));
}

function normalizeId(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function nextId(rows) {
    return rows.reduce((max, row) => Math.max(max, normalizeId(row.id) || 0), 0) + 1;
}

function frameworkFallbackAPI() {
    return {
        createDatabase: async () => {
            saveConfigFallback({ databasePath: 'browser-fallback' });
            return 'Database created in browser fallback mode';
        },
        connectDatabase: async () => {
            saveConfigFallback({ databasePath: 'browser-fallback' });
            return 'Connected successfully in browser fallback mode';
        },
        getConfig: async () => getConfigFallback(),
        loadExistingDatabase: async () => {
            const config = getConfigFallback();
            return config ? { success: true } : { success: false, error: 'No valid database found' };
        },
        saveData: async (collection, data) => {
            const rows = loadCollection(collection);
            const id = nextId(rows);
            rows.push({ id, data });
            saveCollection(collection, rows);
            return { success: true, id };
        },
        getData: async (collection) => {
            const rows = loadCollection(collection);
            return {
                success: true,
                data: rows.map(row => ({ id: row.id, ...row.data })),
            };
        },
        updateData: async (collection, id, data) => {
            const rows = loadCollection(collection);
            const idx = rows.findIndex(row => row.id == id);
            if (idx === -1) return { success: false, error: 'Record not found' };
            rows[idx] = { id: normalizeId(id) ?? rows[idx].id, data };
            saveCollection(collection, rows);
            return { success: true };
        },
        deleteData: async (collection, id) => {
            const rows = loadCollection(collection);
            const nextRows = rows.filter(row => row.id != id);
            saveCollection(collection, nextRows);
            return { success: true };
        },
        countData: async (collection) => {
            const rows = loadCollection(collection);
            return { success: true, total: rows.length };
        },
        searchData: async (collection, keyword) => {
            const rows = loadCollection(collection);
            const q = String(keyword || '').toLowerCase();
            const data = rows
                .map(row => ({ id: row.id, ...row.data }))
                .filter(row => JSON.stringify(row).toLowerCase().includes(q));
            return { success: true, data };
        },
    };
}

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if ([...document.scripts].some(script => script.src === src)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

async function loadFirebaseCompat() {
    if (window.firebase?.initializeApp && window.firebase?.auth && window.firebase?.database) {
        return;
    }
    await loadScriptOnce(`${FIREBASE_SDK_BASE}firebase-app-compat.js`);
    await loadScriptOnce(`${FIREBASE_SDK_BASE}firebase-auth-compat.js`);
    await loadScriptOnce(`${FIREBASE_SDK_BASE}firebase-database-compat.js`);
}

async function initFirebase() {
    if (!canAttemptFirebase()) {
        throw firebaseLastError || new Error('Firebase skipped while offline');
    }
    if (!firebaseReadyPromise) {
        firebaseReadyPromise = (async () => {
            try {
                await loadFirebaseCompat();
                firebaseApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
                firebaseAuth = firebase.auth(firebaseApp);
                firebaseDb = firebase.database(firebaseApp);
                try {
                    await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                } catch (e) {}
                enableFirebaseAgain();
                return { firebaseApp, firebaseAuth, firebaseDb };
            } catch (error) {
                disableFirebaseTemporarily(error);
                throw error;
            }
        })();
    }
    return firebaseReadyPromise;
}

async function getFirebaseAuth() {
    await initFirebase();
    return firebaseAuth;
}

async function getFirebaseDb() {
    await initFirebase();
    return firebaseDb;
}

async function waitForCurrentUser(auth, timeoutMs = 2500) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            try {
                unsub?.();
            } catch (e) {}
            resolve(auth.currentUser || null);
        }, timeoutMs);

        const unsub = auth.onAuthStateChanged((user) => {
            clearTimeout(timer);
            try {
                unsub();
            } catch (e) {}
            resolve(user || null);
        });
    });
}

async function getFirebaseSessionUser() {
    const storedUser = getStoredSessionUser();
    if (storedUser) return storedUser;
    if (!canAttemptFirebase()) return null;
    try {
        const auth = await getFirebaseAuth();
        return auth.currentUser || await waitForCurrentUser(auth);
    } catch (e) {
        return null;
    }
}

function getStoredSessionUser() {
    const sources = [
        sessionStorage.getItem(FIREBASE_SESSION_KEY),
        localStorage.getItem(APP_SESSION_KEY),
    ];

    for (const raw of sources) {
        if (!raw) continue;
        try {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.uid || parsed.userId || parsed.email)) {
                return parsed;
            }
        } catch (e) {}
    }

    return null;
}

const firebaseBackendAPI = {
    createDatabase: async () => {
        await initFirebase();
        return 'Connected to Firebase Realtime Database';
    },
    connectDatabase: async () => {
        await initFirebase();
        return 'Connected to Firebase Realtime Database';
    },
    getConfig: async () => ({
        provider: 'firebase',
        projectId: FIREBASE_CONFIG.projectId,
        databaseURL: FIREBASE_CONFIG.databaseURL,
        authDomain: FIREBASE_CONFIG.authDomain,
        currentUser: (await getFirebaseSessionUser())?.email || null,
    }),
    loadExistingDatabase: async () => {
        await initFirebase();
        return { success: true };
    },
    saveData: async (collection, data) => {
        const rows = await readMutableRows(collection);
        const id = nextId(rows);
        const payload = { id, ...data };
        await persistMutableRows(collection, [...rows, payload]);

        if (canAttemptFirebase()) {
            try {
                const db = await getFirebaseDb();
                await db.ref(collection).child(String(id)).set(payload);
            } catch (error) {
                disableFirebaseTemporarily(error);
            }
        }

        return { success: true, id };
    },
    getData: async (collection) => {
        const cached = await readCollectionCache(collection);
        if (cached) {
            return { success: true, data: cached };
        }
        const rows = await readMutableRows(collection);
        if (!canAttemptFirebase()) {
            return { success: true, data: rows };
        }

        try {
            const db = await getFirebaseDb();
            const snap = await db.ref(collection).once('value');
            const remoteRows = [];
            snap.forEach(child => {
                const value = child.val() || {};
                remoteRows.push({ id: normalizeId(child.key) ?? child.key, ...value });
            });
            remoteRows.sort((a, b) => (normalizeId(a.id) || 0) - (normalizeId(b.id) || 0));
            await writeCollectionCache(collection, remoteRows);
            return { success: true, data: remoteRows };
        } catch (error) {
            disableFirebaseTemporarily(error);
            return { success: true, data: rows };
        }
    },
    updateData: async (collection, id, data) => {
        const rows = await readMutableRows(collection);
        const rowId = normalizeId(id) ?? id;
        const nextRows = rows.map(row => row.id == rowId ? { ...row, id: rowId, ...data } : row);
        await persistMutableRows(collection, nextRows);

        if (canAttemptFirebase()) {
            try {
                const db = await getFirebaseDb();
                await db.ref(collection).child(String(id)).update({ id: rowId, ...data });
            } catch (error) {
                disableFirebaseTemporarily(error);
            }
        }

        return { success: true };
    },
    deleteData: async (collection, id) => {
        const nextRows = await deleteMutableRow(collection, id);

        if (canAttemptFirebase()) {
            try {
                const db = await getFirebaseDb();
                await db.ref(collection).child(String(id)).remove();
            } catch (error) {
                disableFirebaseTemporarily(error);
            }
        }

        return { success: true };
    },
    countData: async (collection) => {
        const cached = await readCollectionCache(collection);
        if (cached) {
            return { success: true, total: cached.length };
        }
        const localRows = await readMutableRows(collection);
        if (!canAttemptFirebase()) {
            return { success: true, total: localRows.length };
        }

        try {
            const db = await getFirebaseDb();
            const snap = await db.ref(collection).once('value');
            return { success: true, total: snap.numChildren() };
        } catch (error) {
            disableFirebaseTemporarily(error);
            return { success: true, total: localRows.length };
        }
    },
    searchData: async (collection, keyword) => {
        const q = String(keyword || '').toLowerCase();
        const cached = await readCollectionCache(collection);
        if (cached) {
            return {
                success: true,
                data: cached.filter(row => JSON.stringify(row).toLowerCase().includes(q)),
            };
        }

        const localRows = await readMutableRows(collection);
        if (!canAttemptFirebase()) {
            return {
                success: true,
                data: localRows.filter(row => JSON.stringify(row).toLowerCase().includes(q)),
            };
        }

        const result = await firebaseBackendAPI.getData(collection);
        return {
            success: true,
            data: (result.data || []).filter(row => JSON.stringify(row).toLowerCase().includes(q)),
        };
    },
};

const fallbackAPI = frameworkFallbackAPI();

async function resolveBackend() {
    const native = getNativeBridge();
    if (native) return native;
    if (!canAttemptFirebase()) return fallbackAPI;
    try {
        await initFirebase();
        return firebaseBackendAPI;
    } catch (error) {
        return fallbackAPI;
    }
}

function proxyMethod(methodName) {
    return async (...args) => {
        const backend = await resolveBackend();
        const method = backend?.[methodName];
        if (typeof method !== 'function') {
            throw new Error(`Backend method not available: ${methodName}`);
        }
        return await method(...args);
    };
}

window.frameworkAPI = {
    createDatabase: proxyMethod('createDatabase'),
    connectDatabase: proxyMethod('connectDatabase'),
    getConfig: proxyMethod('getConfig'),
    loadExistingDatabase: proxyMethod('loadExistingDatabase'),
    saveData: proxyMethod('saveData'),
    getData: proxyMethod('getData'),
    updateData: proxyMethod('updateData'),
    deleteData: proxyMethod('deleteData'),
    countData: proxyMethod('countData'),
    searchData: proxyMethod('searchData'),
};

window.FirebaseAuthAPI = {
    ready: initFirebase,
    getCurrentUser: getFirebaseSessionUser,
    signIn: async (email, password) => {
        if (!canAttemptFirebase()) {
            throw new Error('Offline mode: Firebase login is unavailable');
        }
        const auth = await getFirebaseAuth();
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (e) {}
        const credential = await auth.signInWithEmailAndPassword(email, password);
        const user = credential.user;
        if (user) {
            sessionStorage.setItem(FIREBASE_SESSION_KEY, JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                loginTime: new Date().toISOString(),
            }));
            localStorage.setItem(APP_SESSION_KEY, JSON.stringify({
                userId: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                loginTime: new Date().toISOString(),
            }));
        }
        return user;
    },
    signOut: async () => {
        sessionStorage.removeItem(FIREBASE_SESSION_KEY);
        localStorage.removeItem(APP_SESSION_KEY);
        if (!canAttemptFirebase()) return { success: true };
        const auth = await getFirebaseAuth();
        return auth.signOut();
    },
    sendPasswordResetEmail: async (email) => {
        if (!canAttemptFirebase()) {
            throw new Error('Offline mode: password reset is unavailable');
        }
        const auth = await getFirebaseAuth();
        return auth.sendPasswordResetEmail(email);
    },
    onAuthStateChanged: async (callback) => {
        if (!canAttemptFirebase()) {
            callback(getStoredSessionUser());
            return () => {};
        }
        const auth = await getFirebaseAuth();
        return auth.onAuthStateChanged(callback);
    },
    waitForAuth: async () => {
        if (!canAttemptFirebase()) {
            return getStoredSessionUser();
        }
        const auth = await getFirebaseAuth();
        return await waitForCurrentUser(auth);
    },
};

class FrameworkDB {
    static async save(collection, data) {
        const result = await window.frameworkAPI.saveData(collection, data);
        return result;
    }

    static async get(collection) {
        const cached = await readCollectionCache(collection);
        if (cached) {
            return { success: true, data: cached };
        }

        const result = await window.frameworkAPI.getData(collection);
        if (result?.success && Array.isArray(result.data)) {
            await writeCollectionCache(collection, result.data);
        }
        return result;
    }

    static async update(collection, id, data) {
        const result = await window.frameworkAPI.updateData(collection, id, data);
        return result;
    }

    static async delete(collection, id) {
        const result = await window.frameworkAPI.deleteData(collection, id);
        return result;
    }

    static async count(collection) {
        const cached = await readCollectionCache(collection);
        if (cached) {
            return { success: true, total: cached.length };
        }

        return await window.frameworkAPI.countData(collection);
    }

    static async search(collection, keyword) {
        const cached = await readCollectionCache(collection);
        if (cached) {
            const q = String(keyword || '').toLowerCase();
            return {
                success: true,
                data: cached.filter(row => JSON.stringify(row).toLowerCase().includes(q)),
            };
        }

        return await window.frameworkAPI.searchData(collection, keyword);
    }
}

window.FrameworkDB = FrameworkDB;

window.addEventListener('online', () => {
    enableFirebaseAgain();
    firebaseReadyPromise = null;
});

window.addEventListener('offline', () => {
    disableFirebaseTemporarily(firebaseLastError || new Error('Browser offline'));
});

async function enforceAuthGate() {
    if (isLoginPage()) return;
    if (new URLSearchParams(window.location.search).get('preview') === '1') return;
    if (getStoredSessionUser()) return;
    if (!isOnlineNow()) {
        window.location.replace('login.html');
        return;
    }

    try {
        const user = await window.FirebaseAuthAPI.waitForAuth();
        if (user || getStoredSessionUser()) {
            return;
        }
        if (!user) {
            window.location.replace('login.html');
        }
    } catch (error) {
        console.warn('Auth gate fallback:', error?.message || error);
        if (!getStoredSessionUser()) {
            window.location.replace('login.html');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceAuthGate);
} else {
    enforceAuthGate();
}
