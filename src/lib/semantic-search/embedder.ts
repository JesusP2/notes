import { pipeline, type FeatureExtractionPipeline, type Tensor } from "@xenova/transformers";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIM = 384;

let extractor: FeatureExtractionPipeline | null = null;
let initPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;

  if (!initPromise) {
    initPromise = pipeline("feature-extraction", MODEL_NAME, {
      quantized: true,
    }).then((pipe) => {
      extractor = pipe as FeatureExtractionPipeline;
      return extractor;
    });
  }

  return initPromise;
}

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

function meanPool(embeddings: Tensor): number[] {
  const data = embeddings.data as Float32Array;
  const [_batch, seqLen, hiddenSize] = embeddings.dims;

  const pooled = new Array(hiddenSize).fill(0);
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

export async function embedText(text: string): Promise<number[]> {
  const pipe = await getExtractor();
  const output = await pipe(text, { pooling: "mean", normalize: true });

  let embedding: number[];

  if (output.data && output.dims) {
    if (output.dims.length === 2 && output.dims[0] === 1) {
      embedding = Array.from(output.data as Float32Array);
    } else if (output.dims.length === 3) {
      embedding = meanPool(output);
    } else {
      embedding = Array.from(output.data as Float32Array);
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

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    const embedding = await embedText(text);
    results.push(embedding);
  }

  return results;
}

export function serializeEmbedding(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function deserializeEmbedding(serialized: string): number[] {
  const trimmed = serialized.slice(1, -1);
  return trimmed.split(",").map((s) => parseFloat(s));
}

export async function preloadModel(): Promise<void> {
  await getExtractor();
}
