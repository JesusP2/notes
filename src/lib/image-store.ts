import { ulid } from "ulidx";
import { eq } from "drizzle-orm";
import { getDrizzleInstance } from "@/lib/pglite";
import { images } from "@/db/schema/graph";
import {
  saveBlob,
  getBlob,
  deleteBlob,
  getBlobUrlCached,
  revokeCachedBlobUrl,
} from "@/lib/local-blob-store";

export const LOCAL_IMAGE_PROTOCOL = "local://";

export function generateImageKey(userId: string, filename: string): string {
  const id = ulid();
  return `media/${userId}/${id}/${filename}`;
}

export function isLocalImageUrl(url: string): boolean {
  return url.startsWith(LOCAL_IMAGE_PROTOCOL);
}

export function extractKeyFromLocalUrl(url: string): string {
  return url.replace(LOCAL_IMAGE_PROTOCOL, "");
}

export function createLocalImageUrl(key: string): string {
  return `${LOCAL_IMAGE_PROTOCOL}${key}`;
}

export interface SaveImageOptions {
  userId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export interface SavedImage {
  id: string;
  blobKey: string;
  localUrl: string;
  mimeType: string;
  size: number;
  filename: string;
}

export async function saveImage(options: SaveImageOptions): Promise<SavedImage> {
  const { userId, file, onProgress } = options;

  const blobKey = generateImageKey(userId, file.name);
  const id = ulid();

  onProgress?.(10);

  await saveBlob(blobKey, file, file.type);

  onProgress?.(50);

  const db = getDrizzleInstance();
  await db.insert(images).values({
    id,
    userId,
    blobKey,
    mimeType: file.type,
    size: file.size,
    filename: file.name,
  });

  onProgress?.(100);

  return {
    id,
    blobKey,
    localUrl: createLocalImageUrl(blobKey),
    mimeType: file.type,
    size: file.size,
    filename: file.name,
  };
}

export async function getImageUrl(localUrl: string): Promise<string | null> {
  if (!isLocalImageUrl(localUrl)) {
    return localUrl;
  }

  const key = extractKeyFromLocalUrl(localUrl);
  return getBlobUrlCached(key);
}

export async function getImageBlob(localUrl: string): Promise<Blob | null> {
  if (!isLocalImageUrl(localUrl)) {
    return null;
  }

  const key = extractKeyFromLocalUrl(localUrl);
  const stored = await getBlob(key);
  return stored?.data ?? null;
}

export async function deleteImage(localUrl: string): Promise<void> {
  if (!isLocalImageUrl(localUrl)) return;

  const key = extractKeyFromLocalUrl(localUrl);

  revokeCachedBlobUrl(key);
  await deleteBlob(key);

  const db = getDrizzleInstance();
  await db.delete(images).where(eq(images.blobKey, key));
}

export async function getUnsyncedImages(userId: string) {
  const db = getDrizzleInstance();
  return db.select().from(images).where(eq(images.userId, userId));
}

export async function markImageSynced(blobKey: string): Promise<void> {
  const db = getDrizzleInstance();
  await db.update(images).set({ syncedAt: new Date() }).where(eq(images.blobKey, blobKey));
}
