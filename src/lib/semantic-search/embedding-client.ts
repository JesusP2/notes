/**
 * Main thread client for the embedding Web Worker.
 * Provides a Promise-based API for computing embeddings.
 *
 * Features:
 * - Singleton worker instance (loaded once, reused)
 * - Request/response correlation with incrementing IDs
 * - Graceful error handling and worker failure recovery
 * - Uses transferable objects (Float32Array) for efficiency
 */

type WorkerStatus = "uninitialized" | "initializing" | "ready" | "error";

interface PendingRequest {
  resolve: (value: Float32Array | Float32Array[]) => void;
  reject: (error: Error) => void;
}

interface WorkerResponse {
  id?: number;
  type?: string;
  ok?: boolean;
  result?: Float32Array | Float32Array[];
  error?: string;
}

let worker: Worker | null = null;
let workerStatus: WorkerStatus = "uninitialized";
let workerError: Error | null = null;
let initPromise: Promise<void> | null = null;

let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

function getNextId(): number {
  requestId += 1;
  return requestId;
}

function createWorker(): Worker {
  return new Worker(new URL("./embedding.worker.ts", import.meta.url), {
    type: "module",
  });
}

function handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
  const data = event.data;

  // Handle ready signal
  if (data.type === "ready") {
    console.log('ready')
    return;
  }

  // Handle response with ID
  if (data.id !== undefined) {
    const pending = pendingRequests.get(data.id);
    if (pending) {
      pendingRequests.delete(data.id);

      if (data.ok && data.result !== undefined) {
        pending.resolve(data.result);
      } else {
        pending.reject(new Error(data.error || "Unknown worker error"));
      }
    }
  }
}

function handleWorkerError(event: ErrorEvent) {
  workerStatus = "error";
  workerError = new Error(`Worker error: ${event.message}`);

  // Reject all pending requests
  for (const [id, pending] of pendingRequests) {
    pending.reject(workerError);
    pendingRequests.delete(id);
  }
}

async function ensureWorkerReady(): Promise<void> {
  if (workerStatus === "ready") {
    return;
  }

  if (workerStatus === "error") {
    throw workerError || new Error("Worker failed to initialize");
  }

  if (workerStatus === "initializing" && initPromise) {
    return initPromise;
  }

  workerStatus = "initializing";

  initPromise = new Promise<void>((resolve, reject) => {
    try {
      worker = createWorker();
      worker.onmessage = handleWorkerMessage;
      worker.onerror = handleWorkerError;

      // Send init message to warm up the model
      const id = getNextId();

      const timeout = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error("Worker initialization timed out"));
      }, 120000); // 2 minute timeout for model download

      pendingRequests.set(id, {
        resolve: () => {
          clearTimeout(timeout);
          workerStatus = "ready";
          resolve();
        },
        reject: (err) => {
          clearTimeout(timeout);
          workerStatus = "error";
          workerError = err;
          reject(err);
        },
      });

      worker.postMessage({ id, type: "init" });
    } catch (err) {
      workerStatus = "error";
      workerError = err instanceof Error ? err : new Error(String(err));
      reject(workerError);
    }
  });

  return initPromise;
}

function sendRequest<T extends Float32Array | Float32Array[]>(
  type: "embed" | "embedBatch",
  payload: string | string[],
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (workerStatus === "error") {
      reject(workerError || new Error("Worker is in error state"));
      return;
    }

    if (!worker) {
      reject(new Error("Worker not initialized"));
      return;
    }

    const id = getNextId();
    pendingRequests.set(id, {
      resolve: resolve as (value: Float32Array | Float32Array[]) => void,
      reject,
    });

    worker.postMessage({ id, type, payload });
  });
}

/**
 * Initialize the embedding worker and preload the model.
 * Call this early to warm up the model before user interactions.
 */
export async function initEmbeddingWorker(): Promise<void> {
  await ensureWorkerReady();
}

/**
 * Check if the embedding worker is ready.
 */
export function isEmbeddingWorkerReady(): boolean {
  return workerStatus === "ready";
}

/**
 * Check if the embedding worker failed to initialize.
 */
export function getEmbeddingWorkerError(): Error | null {
  return workerError;
}

/**
 * Compute embedding for a single text.
 * Returns a Float32Array with 384 dimensions.
 */
export async function embed(text: string): Promise<Float32Array> {
  await ensureWorkerReady();
  return sendRequest<Float32Array>("embed", text);
}

/**
 * Compute embeddings for multiple texts in batch.
 * More efficient than calling embed() multiple times.
 * Returns an array of Float32Array, each with 384 dimensions.
 */
export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) {
    return [];
  }

  await ensureWorkerReady();
  return sendRequest<Float32Array[]>("embedBatch", texts);
}

/**
 * Terminate the worker (for cleanup during testing).
 */
export function terminateEmbeddingWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }

  workerStatus = "uninitialized";
  workerError = null;
  initPromise = null;
  requestId = 0;
  pendingRequests.clear();
}
