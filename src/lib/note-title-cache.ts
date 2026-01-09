import type { Node } from "@/db/schema/graph";

interface TitleCacheEntry {
  noteId: string;
  updatedAt: Date;
}

class NoteTitleCache {
  private cache = new Map<string, TitleCacheEntry>();
  private userId: string | null = null;
  private initialized = false;

  initialize(nodes: Node[], userId: string): void {
    this.cache.clear();
    this.userId = userId;

    const noteNodes = nodes
      .filter((n) => n.type === "note" && n.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    for (const node of noteNodes) {
      const key = node.title.trim().toLowerCase();
      if (!this.cache.has(key)) {
        this.cache.set(key, { noteId: node.id, updatedAt: node.updatedAt });
      }
    }

    this.initialized = true;
  }

  onNoteChange(node: Node): void {
    if (node.type !== "note" || node.userId !== this.userId) return;

    const key = node.title.trim().toLowerCase();
    const existing = this.cache.get(key);

    if (!existing || existing.noteId === node.id || node.updatedAt >= existing.updatedAt) {
      this.cache.set(key, { noteId: node.id, updatedAt: node.updatedAt });
    }
  }

  onNoteDelete(nodeId: string, title: string): void {
    const key = title.trim().toLowerCase();
    const existing = this.cache.get(key);
    if (existing?.noteId === nodeId) {
      this.cache.delete(key);
    }
  }

  onNoteTitleChange(nodeId: string, oldTitle: string, newTitle: string, updatedAt: Date): void {
    const oldKey = oldTitle.trim().toLowerCase();
    const oldEntry = this.cache.get(oldKey);
    if (oldEntry?.noteId === nodeId) {
      this.cache.delete(oldKey);
    }

    const newKey = newTitle.trim().toLowerCase();
    this.cache.set(newKey, { noteId: nodeId, updatedAt });
  }

  resolve(title: string): string | undefined {
    if (!this.initialized) return undefined;
    return this.cache.get(title.trim().toLowerCase())?.noteId;
  }

  clear(): void {
    this.cache.clear();
    this.userId = null;
    this.initialized = false;
  }
}

export const noteTitleCache = new NoteTitleCache();
