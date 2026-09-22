const DB_NAME = "afterimage";
const DB_VERSION = 1;
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
      for (const name of ["audioEvents","visualEvents","correlated"] as const) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" }).createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!db.objectStoreNames.contains("experiments")) db.createObjectStore("experiments", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export const db = {
  put: <T>(store: string, value: T) => tx(store, "readwrite", (s) => s.put(value)),
  get: <T>(store: string, id: string) => tx<T>(store, "readonly", (s) => s.get(id)),
  getAll: <T>(store: string) => tx<T[]>(store, "readonly", (s) => s.getAll()),
  delete: (store: string, id: string) => tx(store, "readwrite", (s) => s.delete(id)),
  clear: async (store: string) => { const database = await openDb(); return new Promise<void>((resolve, reject) => { const req = database.transaction(store, "readwrite").objectStore(store).clear(); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); }); },
};
export async function wipeAllEvidence() {
  await Promise.all(["sessions","audioEvents","visualEvents","correlated","experiments"].map((s) => db.clear(s)));
}
