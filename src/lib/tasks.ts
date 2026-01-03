import { ulid } from "ulidx";
import { hashContent } from "@/lib/content-hash";
import { tasksCollection } from "@/lib/collections";

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
  userId,
  noteId,
  content,
}: {
  userId: string;
  noteId: string;
  content: string;
}): Promise<void> {
  const tasks = parseTasks(content, noteId);
  const state = await tasksCollection.stateWhenReady();
  const existing = Array.from(state.values()).filter(
    (row) => row.userId === userId && row.noteId === noteId,
  );
  const existingByBlock = new Map(existing.map((row) => [row.blockId, row]));
  const seen = new Set<string>();
  const now = new Date();

  for (const task of tasks) {
    const existingRow = existingByBlock.get(task.blockId);
    seen.add(task.blockId);
    if (existingRow) {
      const tx = tasksCollection.update(existingRow.id, (draft) => {
        draft.content = task.content;
        draft.isDone = task.isDone;
        draft.position = task.position;
        draft.checkedAt = task.isDone ? now : null;
        draft.updatedAt = now;
      });
      await tx.isPersisted.promise;
    } else {
      const tx = tasksCollection.insert({
        id: ulid(),
        userId,
        noteId,
        blockId: task.blockId,
        content: task.content,
        isDone: task.isDone,
        checkedAt: task.isDone ? now : null,
        dueAt: null,
        priority: null,
        position: task.position,
        createdAt: now,
        updatedAt: now,
      });
      await tx.isPersisted.promise;
    }
  }

  const toDelete = existing.filter((row) => !seen.has(row.blockId)).map((row) => row.id);
  if (toDelete.length > 0) {
    const tx = tasksCollection.delete(toDelete);
    await tx.isPersisted.promise;
  }
}
