import type { PGlite } from "@electric-sql/pglite";
import type { JSONContent } from "@tiptap/core";
import { ulid } from "ulidx";
import { hashContent } from "@/lib/content-hash";
import { getPgliteInstance } from "@/lib/pglite";
import { chunkBlocks } from "./chunker";
import { embedTexts, serializeEmbedding } from "./embedder";
import { extractBlocks } from "./extractor";

let vectorCastAvailable: boolean | null = null;

async function checkVectorCast(db: PGlite): Promise<boolean> {
  if (vectorCastAvailable !== null) return vectorCastAvailable;

  try {
    await db.query(`SELECT '[1,2,3]'::vector`);
    vectorCastAvailable = true;
  } catch {
    vectorCastAvailable = false;
  }
  return vectorCastAvailable;
}

interface ExistingChunk {
  id: string;
  chunkIndex: number;
  chunkHash: string;
}

interface ChunkToProcess {
  chunkIndex: number;
  chunkText: string;
  chunkHash: string;
}

async function getExistingChunks(
  db: PGlite,
  noteId: string,
): Promise<ExistingChunk[]> {
  const result = await db.query<{
    id: string;
    chunk_index: number;
    chunk_hash: string;
  }>(
    `SELECT id, chunk_index, chunk_hash
     FROM note_chunks
     WHERE note_id = $1
     ORDER BY chunk_index`,
    [noteId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    chunkIndex: row.chunk_index,
    chunkHash: row.chunk_hash,
  }));
}

async function deleteChunks(db: PGlite, chunkIds: string[]): Promise<void> {
  if (chunkIds.length === 0) return;

  const placeholders = chunkIds.map((_, i) => `$${i + 1}`).join(",");
  await db.query(`DELETE FROM note_chunks WHERE id IN (${placeholders})`, chunkIds);
}

async function updateChunk(
  db: PGlite,
  chunkId: string,
  chunkText: string,
  chunkHash: string,
  embedding: number[],
  useVectorCast: boolean,
): Promise<void> {
  const embeddingStr = serializeEmbedding(embedding);
  if (useVectorCast) {
    await db.query(
      `UPDATE note_chunks
       SET chunk_text = $1, chunk_hash = $2, embedding = $3::vector
       WHERE id = $4`,
      [chunkText, chunkHash, embeddingStr, chunkId],
    );
  } else {
    await db.query(
      `UPDATE note_chunks
       SET chunk_text = $1, chunk_hash = $2, embedding = $3
       WHERE id = $4`,
      [chunkText, chunkHash, embeddingStr, chunkId],
    );
  }
}

async function insertChunk(
  db: PGlite,
  id: string,
  userId: string,
  noteId: string,
  chunkIndex: number,
  chunkText: string,
  chunkHash: string,
  embedding: number[],
  useVectorCast: boolean,
): Promise<void> {
  const embeddingStr = serializeEmbedding(embedding);
  if (useVectorCast) {
    await db.query(
      `INSERT INTO note_chunks
         (id, user_id, note_id, chunk_index, chunk_text, chunk_hash, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
      [id, userId, noteId, chunkIndex, chunkText, chunkHash, embeddingStr],
    );
  } else {
    await db.query(
      `INSERT INTO note_chunks
         (id, user_id, note_id, chunk_index, chunk_text, chunk_hash, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, noteId, chunkIndex, chunkText, chunkHash, embeddingStr],
    );
  }
}

export async function indexNoteEmbeddings(
  noteId: string,
  userId: string,
  title: string,
  content: JSONContent | null,
): Promise<void> {
  const db = getPgliteInstance();
  const useVectorCast = await checkVectorCast(db);

  const blocks = extractBlocks(content);
  const chunks = chunkBlocks(blocks);

  const chunksToProcess: ChunkToProcess[] = chunks.map((chunk, idx) => {
    const embeddedText = `${title}\n\n${chunk.text}`;
    return {
      chunkIndex: idx,
      chunkText: embeddedText,
      chunkHash: hashContent(embeddedText),
    };
  });

  const existingChunks = await getExistingChunks(db, noteId);
  const existingByIndex = new Map(existingChunks.map((c) => [c.chunkIndex, c]));

  const toInsert: ChunkToProcess[] = [];
  const toUpdate: { existing: ExistingChunk; updated: ChunkToProcess }[] = [];
  const reusedIds = new Set<string>();

  for (const chunk of chunksToProcess) {
    const existing = existingByIndex.get(chunk.chunkIndex);

    if (existing) {
      if (existing.chunkHash === chunk.chunkHash) {
        reusedIds.add(existing.id);
      } else {
        toUpdate.push({ existing, updated: chunk });
        reusedIds.add(existing.id);
      }
    } else {
      toInsert.push(chunk);
    }
  }

  const toDelete = existingChunks
    .filter((c) => !reusedIds.has(c.id))
    .map((c) => c.id);

  if (toDelete.length > 0) {
    await deleteChunks(db, toDelete);
  }

  // Collect all texts that need embedding
  const textsToEmbed: string[] = [];
  const updateItems: { existing: ExistingChunk; updated: ChunkToProcess }[] = [];
  const insertItems: ChunkToProcess[] = [];

  for (const item of toUpdate) {
    textsToEmbed.push(item.updated.chunkText);
    updateItems.push(item);
  }

  for (const chunk of toInsert) {
    textsToEmbed.push(chunk.chunkText);
    insertItems.push(chunk);
  }

  // Batch embed all texts at once
  const embeddings = textsToEmbed.length > 0 ? await embedTexts(textsToEmbed) : [];
  let embeddingIndex = 0;

  // Apply updates
  for (const { existing, updated } of updateItems) {
    const embedding = embeddings[embeddingIndex++];
    await updateChunk(
      db,
      existing.id,
      updated.chunkText,
      updated.chunkHash,
      embedding,
      useVectorCast,
    );
  }

  // Apply inserts
  for (const chunk of insertItems) {
    const embedding = embeddings[embeddingIndex++];
    await insertChunk(
      db,
      ulid(),
      userId,
      noteId,
      chunk.chunkIndex,
      chunk.chunkText,
      chunk.chunkHash,
      embedding,
      useVectorCast,
    );
  }
}

export async function deleteNoteChunks(noteId: string): Promise<void> {
  const db = getPgliteInstance();
  await db.query(`DELETE FROM note_chunks WHERE note_id = $1`, [noteId]);
}

export async function getNoteChunkCount(noteId: string): Promise<number> {
  const db = getPgliteInstance();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM note_chunks WHERE note_id = $1`,
    [noteId],
  );
  return parseInt(result.rows[0]?.count || "0", 10);
}
