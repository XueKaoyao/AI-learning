export interface dbOptions {
  dbName: string;
  dbVersion: number;
  storeName: string;
  storeKey: string;
}

export function opts(options: dbOptions) {
  return {
    dbName: options.dbName,
    dbVersion: options.dbVersion,
    storeName: options.storeName,
    storeKey: options.storeKey,
  };
}

function openDB(options: dbOptions): Promise<IDBDatabase> {
  const { dbName, dbVersion, storeName } = options;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB: database blocked'));
  });
}

export async function clearMessageHistory(options: dbOptions): Promise<void> {
  try {
    await withStore(options, 'readwrite', (store) =>
      store.delete(options.storeKey),
    );
  } catch (error) {
    console.error('Error clearing message history:', error);
  }
}

export async function withStore(
  options: dbOptions,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void,
): Promise<void> {
  const db = await openDB(options);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(options.storeName, mode);
    const store = transaction.objectStore(options.storeName);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    const request = fn(store);
    if (request) {
      request.onerror = () => reject(request.error);
    }
  });
}

export async function withStoreResult<T>(
  options: dbOptions,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDB(options);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(options.storeName, mode);
    const store = transaction.objectStore(options.storeName);

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
