import type { JSONContent } from "@tiptap/core";
import { getPgliteInstance } from "@/lib/pglite";
import { indexNoteEmbeddings } from "./indexer";

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
}

const BATCH_SIZE = 50;

export interface BackfillProgress {
  total: number;
  processed: number;
  current: string | null;
}

export type BackfillProgressCallback = (progress: BackfillProgress) => void;

export async function backfillAllNotes(
  userId?: string,
  onProgress?: BackfillProgressCallback,
): Promise<{ total: number; indexed: number; errors: number }> {
  const db = getPgliteInstance();

  let countQuery = `SELECT COUNT(*) as count FROM nodes WHERE type = 'note'`;
  const countParams: string[] = [];

  if (userId) {
    countQuery += ` AND user_id = $1`;
    countParams.push(userId);
  }

  const countResult = await db.query<{ count: string }>(countQuery, countParams);
  const total = parseInt(countResult.rows[0]?.count || "0", 10);

  if (total === 0) {
    return { total: 0, indexed: 0, errors: 0 };
  }

  let indexed = 0;
  let errors = 0;
  let offset = 0;

  while (offset < total) {
    let query = `
      SELECT id, user_id, title, content
      FROM nodes
      WHERE type = 'note'
    `;
    const params: (string | number)[] = [];

    if (userId) {
      query += ` AND user_id = $1`;
      params.push(userId);
    }

    query += ` ORDER BY created_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(BATCH_SIZE, offset);

    const result = await db.query<NoteRow>(query, params);

    for (const row of result.rows) {
      try {
        onProgress?.({
          total,
          processed: indexed + errors,
          current: row.title,
        });

        let content: JSONContent | null = null;
        if (row.content) {
          try {
            content = JSON.parse(row.content) as JSONContent;
          } catch {
            content = null;
          }
        }

        await indexNoteEmbeddings(row.id, row.user_id, row.title, content);
        indexed++;
      } catch (err) {
        console.error(`Failed to index note ${row.id}:`, err);
        errors++;
      }
    }

    offset += BATCH_SIZE;
  }

  onProgress?.({
    total,
    processed: indexed + errors,
    current: null,
  });

  return { total, indexed, errors };
}

export async function backfillNote(noteId: string): Promise<boolean> {
  const db = getPgliteInstance();

  const result = await db.query<NoteRow>(
    `SELECT id, user_id, title, content
     FROM nodes
     WHERE id = $1 AND type = 'note'`,
    [noteId],
  );

  const row = result.rows[0];
  if (!row) {
    return false;
  }

  let content: JSONContent | null = null;
  if (row.content) {
    try {
      content = JSON.parse(row.content) as JSONContent;
    } catch {
      content = null;
    }
  }

  await indexNoteEmbeddings(row.id, row.user_id, row.title, content);
  return true;
}
