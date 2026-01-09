/**
 * Public API for computing text embeddings.
 * All heavy computation is delegated to the Web Worker.
 */

import {
  embed as workerEmbed,
  embedBatch as workerEmbedBatch,
  initEmbeddingWorker,
  isEmbeddingWorkerReady,
  getEmbeddingWorkerError,
} from "./embedding-client";

/**
 * Compute embedding for a single text.
 * Returns a number[] with 384 dimensions (converted from Float32Array).
 */
export async function embedText(text: string): Promise<number[]> {
  const embedding = await workerEmbed(text);
  return Array.from(embedding);
}

/**
 * Compute embeddings for multiple texts in batch.
 * More efficient than calling embedText() multiple times.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const embeddings = await workerEmbedBatch(texts);
  return embeddings.map((e) => Array.from(e));
}

/**
 * Serialize embedding to string format for storage.
 * Format: "[n1,n2,n3,...]"
 */
export function serializeEmbedding(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Deserialize embedding from string format.
 */
export function deserializeEmbedding(serialized: string): number[] {
  const trimmed = serialized.slice(1, -1);
  return trimmed.split(",").map((s) => parseFloat(s));
}

/**
 * Initialize the embedding worker and preload the model.
 * Call this early to warm up the model.
 */
export async function preloadModel(): Promise<void> {
  await initEmbeddingWorker();
}

/**
 * Check if the embedding model is ready.
 */
export function isModelReady(): boolean {
  return isEmbeddingWorkerReady();
}

/**
 * Get the error if the embedding worker failed to initialize.
 */
export function getModelError(): Error | null {
  return getEmbeddingWorkerError();
}
