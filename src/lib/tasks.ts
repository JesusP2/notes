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

export function syncTasks({
  userId,
  noteId,
  content,
}: {
  userId: string;
  noteId: string;
  content: string;
}): void {
  const tasks = parseTasks(content, noteId);
  const existing = Array.from(tasksCollection.state.values()).filter(
    (row) => row.userId === userId && row.noteId === noteId,
  );
  const existingByBlock = new Map(existing.map((row) => [row.blockId, row]));
  const seen = new Set<string>();
  const now = new Date();

  for (const task of tasks) {
    const existingRow = existingByBlock.get(task.blockId);
    seen.add(task.blockId);
    if (existingRow) {
      tasksCollection.update(existingRow.id, (draft) => {
        draft.content = task.content;
        draft.isDone = task.isDone;
        draft.position = task.position;
        draft.checkedAt = task.isDone ? now : null;
        draft.updatedAt = now;
      });
    } else {
      tasksCollection.insert({
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
    }
  }

  const toDelete = existing.filter((row) => !seen.has(row.blockId)).map((row) => row.id);
  if (toDelete.length > 0) {
    tasksCollection.delete(toDelete);
  }
}
