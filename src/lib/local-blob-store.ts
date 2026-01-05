import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface BlobStoreSchema extends DBSchema {
  blobs: {
    key: string;
    value: {
      key: string;
      data: Blob;
      mimeType: string;
      size: number;
      createdAt: Date;
    };
  };
}

const DB_NAME = "notes-blob-store";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

let dbPromise: Promise<IDBPDatabase<BlobStoreSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<BlobStoreSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<BlobStoreSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export interface StoredBlob {
  key: string;
  data: Blob;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export async function saveBlob(key: string, data: Blob, mimeType: string): Promise<StoredBlob> {
  const db = await getDb();
  const storedBlob: StoredBlob = {
    key,
    data,
    mimeType,
    size: data.size,
    createdAt: new Date(),
  };
  await db.put(STORE_NAME, storedBlob);
  return storedBlob;
}

export async function getBlob(key: string): Promise<StoredBlob | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, key);
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

export async function getAllBlobKeys(): Promise<string[]> {
  const db = await getDb();
  return db.getAllKeys(STORE_NAME);
}

export async function getBlobUrl(key: string): Promise<string | null> {
  const blob = await getBlob(key);
  if (!blob) return null;
  return URL.createObjectURL(blob.data);
}

const objectUrlCache = new Map<string, string>();

export async function getBlobUrlCached(key: string): Promise<string | null> {
  const cached = objectUrlCache.get(key);
  if (cached) return cached;

  const url = await getBlobUrl(key);
  if (url) {
    objectUrlCache.set(key, url);
  }
  return url;
}

export function revokeCachedBlobUrl(key: string): void {
  const cached = objectUrlCache.get(key);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(key);
  }
}

export function revokeAllCachedBlobUrls(): void {
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
}
