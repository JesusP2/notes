/**
 * Web Worker for computing text embeddings using Xenova/transformers.
 * This worker keeps the model loaded in memory and processes embedding requests.
 *
 * Message protocol:
 * - Request: { id: number, type: 'init' | 'embed' | 'embedBatch', payload?: string | string[] }
 * - Response: { id: number, ok: boolean, result?: Float32Array | Float32Array[], error?: string }
 */

import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
  type Tensor,
} from "@xenova/transformers";

// Configure to use local models from /models directory (served from public/)
// This prevents CORS issues by loading models from the same origin
env.localModelPath = "/models/";
env.allowRemoteModels = false;
env.allowLocalModels = true;

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIM = 384;

let extractor: FeatureExtractionPipeline | null = null;
let initPromise: Promise<FeatureExtractionPipeline> | null = null;
let initError: Error | null = null;

interface WorkerRequest {
  id: number;
  type: "init" | "embed" | "embedBatch";
  payload?: string | string[];
}

interface WorkerResponse {
  id: number;
  ok: boolean;
  result?: Float32Array | Float32Array[];
  error?: string;
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (initError) {
    throw initError;
  }

  if (extractor) {
    return extractor;
  }

  if (!initPromise) {
    initPromise = pipeline("feature-extraction", MODEL_NAME, {
      quantized: true,
    })
      .then((pipe) => {
        extractor = pipe as FeatureExtractionPipeline;
        return extractor;
      })
      .catch((err) => {
        initError = err instanceof Error ? err : new Error(String(err));
        throw initError;
      });
  }

  return initPromise;
}

function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return vec;
  }

  const normalized = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    normalized[i] = vec[i] / norm;
  }
  return normalized;
}

function meanPool(embeddings: Tensor): Float32Array {
  const data = embeddings.data as Float32Array;
  const [_batch, seqLen, hiddenSize] = embeddings.dims;

  const pooled = new Float32Array(hiddenSize);
  for (let i = 0; i < seqLen; i++) {
    for (let j = 0; j < hiddenSize; j++) {
      pooled[j] += data[i * hiddenSize + j];
    }
  }

  for (let j = 0; j < hiddenSize; j++) {
    pooled[j] /= seqLen;
  }

  return pooled;
}

async function computeEmbedding(text: string): Promise<Float32Array> {
  const pipe = await getExtractor();
  const output = await pipe(text, { pooling: "mean", normalize: true });

  let embedding: Float32Array;

  if (output.data && output.dims) {
    if (output.dims.length === 2 && output.dims[0] === 1) {
      embedding = new Float32Array(output.data as Float32Array);
    } else if (output.dims.length === 3) {
      embedding = meanPool(output);
    } else {
      embedding = new Float32Array(output.data as Float32Array);
    }
  } else {
    throw new Error("Unexpected output format from embedder");
  }

  embedding = l2Normalize(embedding);

  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `Expected embedding dimension ${EMBEDDING_DIM}, got ${embedding.length}`,
    );
  }

  return embedding;
}

async function computeEmbeddingBatch(texts: string[]): Promise<Float32Array[]> {
  const results: Float32Array[] = [];

  for (const text of texts) {
    const embedding = await computeEmbedding(text);
    results.push(embedding);
  }

  return results;
}

function sendResponse(response: WorkerResponse, transferables?: Transferable[]) {
  if (transferables && transferables.length > 0) {
    self.postMessage(response, { transfer: transferables });
  } else {
    self.postMessage(response);
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case "init": {
        await getExtractor();
        sendResponse({ id, ok: true });
        break;
      }

      case "embed": {
        if (typeof payload !== "string") {
          throw new Error("embed requires a string payload");
        }
        const embedding = await computeEmbedding(payload);
        sendResponse({ id, ok: true, result: embedding }, [embedding.buffer]);
        break;
      }

      case "embedBatch": {
        if (!Array.isArray(payload)) {
          throw new Error("embedBatch requires an array payload");
        }
        const embeddings = await computeEmbeddingBatch(payload);
        const transferables = embeddings.map((e) => e.buffer);
        sendResponse({ id, ok: true, result: embeddings }, transferables);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    sendResponse({ id, ok: false, error: errorMessage });
  }
};

// Signal that worker is ready
self.postMessage({ type: "ready" });
