export function createIndexedDbQueueStorage({
    indexedDB, dbName = 'offline-queue', storeName = 'queue'
} = {}) {
    if (typeof indexedDB?.open !== 'function') {
        throw new TypeError('An IndexedDB factory is required.');
    }

    let connection;
    let closeConnection;
    function open() {
        if (!connection) {
            connection = new Promise((resolve, reject) => {
                const request = indexedDB.open(dbName, 1);
                let cancelled = false;
                const cancel = error => {
                    cancelled = true;
                    if (closeConnection === closePending) {
                        connection = undefined;
                        closeConnection = undefined;
                    }
                    reject(error);
                };
                const closePending = () => cancel(new Error('IndexedDB queue connection closed while opening.'));
                closeConnection = closePending;
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
                };
                request.onerror = event => cancel(event?.target?.error ?? request.error ??
                    new Error('IndexedDB queue open failed.'));
                request.onblocked = () => cancel(new Error('IndexedDB queue open blocked.'));
                request.onsuccess = () => {
                    const db = request.result;
                    if (cancelled) {
                        db.close();
                        return;
                    }
                    const invalidate = () => {
                        if (closeConnection === closeOpen) {
                            connection = undefined;
                            closeConnection = undefined;
                        }
                    };
                    const closeOpen = () => {
                        invalidate();
                        db.close();
                    };
                    closeConnection = closeOpen;
                    db.onversionchange = closeOpen;
                    db.onclose = invalidate;
                    resolve(db);
                };
            });
            const attempt = connection;
            attempt.catch(() => {
                if (connection === attempt) connection = undefined;
            });
        }
        return connection;
    }

    async function transact(mode, access) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            const request = access(transaction.objectStore(storeName));
            transaction.oncomplete = () => resolve(request.result ?? null);
            transaction.onerror = event => reject(event?.target?.error ?? request.error ?? transaction.error ??
                new Error('IndexedDB queue transaction failed.'));
            transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB queue transaction aborted.'));
        });
    }

    return {
        close: () => closeConnection?.(),
        getItem: key => transact('readonly', store => store.get(key)),
        async setItem(key, value) { await transact('readwrite', store => store.put(value, key)); },
        async removeItem(key) { await transact('readwrite', store => store.delete(key)); }
    };
}
