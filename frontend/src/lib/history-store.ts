import type { HistoryItem } from "@/lib/types";

const DB_NAME = "image-2";
const DB_VERSION = 2;
const STORE_NAME = "history";
const ITEM_STORE_NAME = "history-items";
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
      if (!db.objectStoreNames.contains(ITEM_STORE_NAME)) {
        db.createObjectStore(ITEM_STORE_NAME, { keyPath: "id" });
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

async function clearIndexedDbList(): Promise<void> {
  await runStoreRequest("readwrite", (store) => store.delete(HISTORY_KEY));
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function readIndexedDbItems(): Promise<HistoryItem[]> {
  const db = await openHistoryDb();
  try {
    const tx = db.transaction(ITEM_STORE_NAME, "readonly");
    const store = tx.objectStore(ITEM_STORE_NAME);
    const items = await requestToPromise(store.getAll());
    await transactionDone(tx);
    return (items as HistoryItem[]).sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

function itemFingerprint(item: HistoryItem): string {
  return JSON.stringify({
    id: item.id,
    createdAt: item.createdAt,
    prompt: item.prompt,
    size: item.size,
    quality: item.quality,
    format: item.format,
    n: item.n,
    imageCount: item.images.length,
    firstImage: item.images[0]?.slice(0, 128),
    referenceCount: item.referenceImages?.length ?? 0,
    favorite: item.favorite,
    status: item.status,
    errorMessage: item.errorMessage,
    durationMs: item.durationMs,
  });
}

async function writeIndexedDbItems(items: HistoryItem[]): Promise<void> {
  const db = await openHistoryDb();
  try {
    const tx = db.transaction(ITEM_STORE_NAME, "readwrite");
    const store = tx.objectStore(ITEM_STORE_NAME);
    const stored = (await requestToPromise(store.getAll())) as HistoryItem[];
    const storedById = new Map(stored.map((item) => [item.id, item]));
    const nextIds = new Set(items.map((item) => item.id));

    for (const item of items) {
      const previous = storedById.get(item.id);
      if (!previous || itemFingerprint(previous) !== itemFingerprint(item)) {
        store.put(item);
      }
    }

    for (const previous of stored) {
      if (!nextIds.has(previous.id)) {
        store.delete(previous.id);
      }
    }

    await transactionDone(tx);
  } finally {
    db.close();
  }
}

function mergeHistoryItems(...groups: HistoryItem[][]): HistoryItem[] {
  const byId = new Map<string, HistoryItem>();
  for (const group of groups) {
    for (const item of group) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function readHistoryStore(): Promise<HistoryItem[]> {
  const legacyItems = readLegacyStorage();

  try {
    const itemStoreItems = await readIndexedDbItems();
    const indexedItems = (await readIndexedDb()) ?? [];
    const mergedItems = mergeHistoryItems(
      indexedItems,
      legacyItems,
      itemStoreItems,
    );

    if (mergedItems.length > itemStoreItems.length) {
      await writeIndexedDbItems(mergedItems);
      await clearIndexedDbList();
      clearLegacyStorage();
    }

    return mergedItems;
  } catch {
    return legacyItems;
  }

  return [];
}

export async function writeHistoryStore(items: HistoryItem[]): Promise<void> {
  try {
    await writeIndexedDbItems(items);
    await clearIndexedDbList();
    clearLegacyStorage();
  } catch {
    writeLegacyStorage(items);
  }
}
