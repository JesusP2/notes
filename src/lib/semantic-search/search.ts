import { getPgliteInstance } from "@/lib/pglite";
import { deserializeEmbedding, embedText, serializeEmbedding } from "./embedder";

export interface SemanticSearchResult {
  noteId: string;
  title: string;
  score: number;
  snippet: string;
  chunkId: string;
}

interface RawSearchRow {
  chunk_id: string;
  note_id: string;
  title: string;
  chunk_text: string;
  distance: number;
}

interface FallbackSearchRow {
  chunk_id: string;
  note_id: string;
  title: string;
  chunk_text: string;
  embedding: string | null;
}

const TOP_K_CHUNKS = 150;
const MAX_SNIPPET_LENGTH = 400;

let vectorSearchAvailable: boolean | null = null;

async function checkVectorSupport(): Promise<boolean> {
  if (vectorSearchAvailable !== null) return vectorSearchAvailable;

  const db = getPgliteInstance();
  try {
    await db.query(`SELECT '[1,2,3]'::vector`);
    vectorSearchAvailable = true;
  } catch {
    vectorSearchAvailable = false;
  }
  return vectorSearchAvailable;
}

function cleanSnippet(chunkText: string, noteTitle: string): string {
  let text = chunkText;

  if (text.startsWith(noteTitle)) {
    text = text.slice(noteTitle.length).trim();
    if (text.startsWith("\n\n")) {
      text = text.slice(2);
    }
  }

  if (text.length > MAX_SNIPPET_LENGTH) {
    text = text.slice(0, MAX_SNIPPET_LENGTH).trimEnd() + "...";
  }

  return text;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function semanticSearch(
  query: string,
  userId: string,
  limit = 20,
): Promise<SemanticSearchResult[]> {
  const db = getPgliteInstance();
  const hasVector = await checkVectorSupport();

  const queryEmbedding = await embedText(query);
  const embeddingStr = serializeEmbedding(queryEmbedding);

  const noteScores = new Map<
    string,
    {
      noteId: string;
      title: string;
      bestScore: number;
      bestSnippet: string;
      bestChunkId: string;
    }
  >();

  if (hasVector) {
    const result = await db.query<RawSearchRow>(
      `SELECT
         nc.id as chunk_id,
         nc.note_id,
         n.title,
         nc.chunk_text,
         nc.embedding <=> $1::vector as distance
       FROM note_chunks nc
       INNER JOIN nodes n ON nc.note_id = n.id
       WHERE nc.user_id = $2
         AND n.user_id = $2
         AND n.type = 'note'
       ORDER BY distance ASC
       LIMIT $3`,
      [embeddingStr, userId, TOP_K_CHUNKS],
    );

    for (const row of result.rows) {
      const score = 1 - row.distance;
      const existing = noteScores.get(row.note_id);

      if (!existing || score > existing.bestScore) {
        noteScores.set(row.note_id, {
          noteId: row.note_id,
          title: row.title,
          bestScore: score,
          bestSnippet: cleanSnippet(row.chunk_text, row.title),
          bestChunkId: row.chunk_id,
        });
      }
    }
  } else {
    const result = await db.query<FallbackSearchRow>(
      `SELECT
         nc.id as chunk_id,
         nc.note_id,
         n.title,
         nc.chunk_text,
         nc.embedding
       FROM note_chunks nc
       INNER JOIN nodes n ON nc.note_id = n.id
       WHERE nc.user_id = $1
         AND n.user_id = $1
         AND n.type = 'note'
         AND nc.embedding IS NOT NULL`,
      [userId],
    );

    for (const row of result.rows) {
      if (!row.embedding) continue;

      const chunkEmbedding = deserializeEmbedding(row.embedding);
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
      const existing = noteScores.get(row.note_id);

      if (!existing || score > existing.bestScore) {
        noteScores.set(row.note_id, {
          noteId: row.note_id,
          title: row.title,
          bestScore: score,
          bestSnippet: cleanSnippet(row.chunk_text, row.title),
          bestChunkId: row.chunk_id,
        });
      }
    }
  }

  const sortedResults = Array.from(noteScores.values())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, limit);

  return sortedResults.map((r) => ({
    noteId: r.noteId,
    title: r.title,
    score: r.bestScore,
    snippet: r.bestSnippet,
    chunkId: r.bestChunkId,
  }));
}

export async function getIndexedNoteCount(userId: string): Promise<number> {
  const db = getPgliteInstance();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(DISTINCT note_id) as count
     FROM note_chunks
     WHERE user_id = $1`,
    [userId],
  );
  return parseInt(result.rows[0]?.count || "0", 10);
}

export async function getTotalChunkCount(userId: string): Promise<number> {
  const db = getPgliteInstance();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM note_chunks
     WHERE user_id = $1`,
    [userId],
  );
  return parseInt(result.rows[0]?.count || "0", 10);
}
