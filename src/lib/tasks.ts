import type { JSONContent } from "@tiptap/core";
import { ulid } from "ulidx";
import { hashContent } from "@/lib/content-hash";
import { tasksCollection } from "@/lib/collections";

export type ParsedTask = {
  blockId: string;
  content: string;
  isDone: boolean;
  position: number;
};

function extractTextFromNode(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(extractTextFromNode).join("");
}

function extractTasksFromJson(
  node: JSONContent,
  tasks: ParsedTask[],
  noteId: string,
  position: { value: number },
): void {
  if (node.type === "taskItem") {
    const checked = node.attrs?.checked === true;
    const taskContent = node.content ? extractTextFromNode({ content: node.content }) : "";
    if (taskContent.trim()) {
      const blockId = hashContent(`${noteId}:${position.value}:${taskContent.trim()}`);
      tasks.push({
        blockId,
        content: taskContent.trim(),
        isDone: checked,
        position: position.value,
      });
    }
    position.value += 1;
    return;
  }

  if (node.content) {
    for (const child of node.content) {
      extractTasksFromJson(child, tasks, noteId, position);
    }
  }
}

export function parseTasks(content: JSONContent, noteId: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  extractTasksFromJson(content, tasks, noteId, { value: 0 });
  return tasks;
}

export function syncTasks({
  userId,
  noteId,
  content,
}: {
  userId: string;
  noteId: string;
  content: JSONContent;
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
