import { ulid } from "ulidx";
import { hashContent } from "@/lib/content-hash";

type QueryableDb = {
  query: <T = any>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

export type ParsedTask = {
  blockId: string;
  content: string;
  isDone: boolean;
  position: number;
};

const TASK_LINE_REGEX = /^- \[([ xX])\]\s+(.*)$/;

export function parseTasks(content: string, noteId: string): ParsedTask[] {
  const lines = content.split(/\r?\n/);
  const tasks: ParsedTask[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const match = line.match(TASK_LINE_REGEX);
    if (!match) continue;
    const isDone = match[1]?.toLowerCase() === "x";
    const taskContent = (match[2] ?? "").trim();
    if (!taskContent) continue;
    const blockId = hashContent(`${noteId}:${i}:${taskContent}`);
    tasks.push({ blockId, content: taskContent, isDone, position: i });
  }

  return tasks;
}

export async function syncTasks({
  db,
  userId,
  noteId,
  content,
}: {
  db: QueryableDb;
  userId: string;
  noteId: string;
  content: string;
}): Promise<void> {
  const tasks = parseTasks(content, noteId);
  const existing = await db.query<{ id: string; block_id: string }>(
    "SELECT id, block_id FROM tasks WHERE user_id = $1 AND note_id = $2",
    [userId, noteId],
  );
  const existingByBlock = new Map(existing.rows.map((row) => [row.block_id, row.id]));
  const seen = new Set<string>();

  for (const task of tasks) {
    const existingId = existingByBlock.get(task.blockId);
    seen.add(task.blockId);
    if (existingId) {
      await db.query(
        `UPDATE tasks
         SET content = $1,
             is_done = $2,
             position = $3,
             checked_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5`,
        [task.content, task.isDone, task.position, existingId, userId],
      );
    } else {
      await db.query(
        `INSERT INTO tasks (id, user_id, note_id, block_id, content, is_done, checked_at, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [ulid(), userId, noteId, task.blockId, task.content, task.isDone, task.position],
      );
    }
  }

  for (const row of existing.rows) {
    if (seen.has(row.block_id)) continue;
    await db.query("DELETE FROM tasks WHERE id = $1 AND user_id = $2", [row.id, userId]);
  }
}
