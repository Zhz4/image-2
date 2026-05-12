import type { HistoryItem } from "@/lib/types";

const DB_NAME = "image-2";
const DB_VERSION = 1;
const STORE_NAME = "history";
const HISTORY_KEY = "items";
const LEGACY_STORAGE_KEY = "image-2:history";

function readLegacyStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function clearLegacyStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function writeLegacyStorage(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Base64 image payloads can exceed localStorage quota.
  }
}

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function runStoreRequest<T>(
  mode: IDBTransactionMode,
  makeRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openHistoryDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = makeRequest(store);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

async function readIndexedDb(): Promise<HistoryItem[] | null> {
  const result = await runStoreRequest("readonly", (store) =>
    store.get(HISTORY_KEY),
  );
  return Array.isArray(result) ? (result as HistoryItem[]) : null;
}

async function writeIndexedDb(items: HistoryItem[]): Promise<void> {
  await runStoreRequest("readwrite", (store) => store.put(items, HISTORY_KEY));
}

export async function readHistoryStore(): Promise<HistoryItem[]> {
  const legacyItems = readLegacyStorage();

  try {
    const indexedItems = await readIndexedDb();
    if (indexedItems) return indexedItems;

    if (legacyItems.length > 0) {
      await writeIndexedDb(legacyItems);
      clearLegacyStorage();
      return legacyItems;
    }
  } catch {
    return legacyItems;
  }

  return [];
}

export async function writeHistoryStore(items: HistoryItem[]): Promise<void> {
  try {
    await writeIndexedDb(items);
    clearLegacyStorage();
  } catch {
    writeLegacyStorage(items);
  }
}
