export function createIndexedDbQueueStorage({
    indexedDB, dbName = 'offline-queue', storeName = 'queue'
} = {}) {
    if (typeof indexedDB?.open !== 'function') {
        throw new TypeError('An IndexedDB factory is required.');
    }

    let connection;
    function open() {
        if (!connection) {
            connection = new Promise((resolve, reject) => {
                const request = indexedDB.open(dbName, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
                };
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result;
                    db.onversionchange = db.onclose = () => {
                        db.close();
                        connection = undefined;
                    };
                    resolve(db);
                };
            }).catch(error => {
                connection = undefined;
                throw error;
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
            transaction.onerror = event => reject(event.target.error ?? transaction.error ??
                new Error('IndexedDB queue transaction failed.'));
            transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB queue transaction aborted.'));
        });
    }

    return {
        getItem: key => transact('readonly', store => store.get(key)),
        async setItem(key, value) { await transact('readwrite', store => store.put(value, key)); },
        async removeItem(key) { await transact('readwrite', store => store.delete(key)); }
    };
}
