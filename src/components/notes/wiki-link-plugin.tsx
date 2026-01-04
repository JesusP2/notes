import { ulid } from "ulidx";
import type { Node } from "@/db/schema/graph";
import { edgesCollection, nodesCollection } from "@/lib/collections";

export const EMBED_LINK_REGEX = /!\[\[([^[\]]+)\]\]/g;

export interface WikiLinkInfo {
  noteId: string | null;
  title: string;
}

export function extractWikiLinksFromHtml(content: string): WikiLinkInfo[] {
  if (!content) return [];

  const results: WikiLinkInfo[] = [];
  const seen = new Set<string>();

  if (typeof window !== "undefined" && "DOMParser" in window) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const links = doc.querySelectorAll("a[data-wiki-link]");

    for (const link of links) {
      const noteId = link.getAttribute("data-note-id");
      const title = link.getAttribute("data-title") || link.textContent || "";

      if (!title.trim()) continue;

      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({ noteId, title: title.trim() });
    }
  }

  return results;
}

export function extractEmbeds(content: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(EMBED_LINK_REGEX)) {
    const rawTitle = match[1]?.trim();
    if (!rawTitle) {
      continue;
    }
    const key = rawTitle.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push(rawTitle);
  }

  return results;
}

export function buildWikiLinkTargets(nodes: Node[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const node of nodes) {
    if (node.type !== "note") {
      continue;
    }
    const key = node.title.trim().toLowerCase();
    if (!key || map[key]) {
      continue;
    }
    map[key] = node.id;
  }

  return map;
}

export function syncWikiLinks({
  noteId,
  userId,
  content,
}: {
  noteId: string;
  userId: string;
  content: string;
}): { resolved: string[]; unresolved: string[] } {
  const wikiLinks = extractWikiLinksFromHtml(content);

  const desiredTargets = new Set<string>();
  const unresolved: string[] = [];

  for (const link of wikiLinks) {
    if (link.noteId && link.noteId !== noteId) {
      desiredTargets.add(link.noteId);
    } else if (!link.noteId) {
      unresolved.push(link.title);
    }
  }

  const existing = Array.from(edgesCollection.state.values()).filter(
    (edge) => edge.userId === userId && edge.sourceId === noteId && edge.type === "references",
  );
  const existingByTarget = new Map(existing.map((row) => [row.targetId, row.id]));
  const now = new Date();

  for (const targetId of desiredTargets) {
    if (existingByTarget.has(targetId)) {
      continue;
    }
    edgesCollection.insert({
      id: ulid(),
      userId,
      sourceId: noteId,
      targetId,
      type: "references",
      createdAt: now,
    });
  }

  const toDelete = existing.filter((row) => !desiredTargets.has(row.targetId)).map((row) => row.id);
  if (toDelete.length > 0) {
    edgesCollection.delete(toDelete);
  }

  return {
    resolved: Array.from(desiredTargets),
    unresolved,
  };
}

export function syncEmbeds({
  noteId,
  userId,
  content,
}: {
  noteId: string;
  userId: string;
  content: string;
}): { resolved: string[]; unresolved: string[] } {
  const titles = extractEmbeds(content);
  const normalized = titles.map((title) => title.toLowerCase());
  const normalizedSet = new Set(normalized);
  const resolvedMap = new Map<string, string>();

  const notes = Array.from(nodesCollection.state.values()).filter(
    (node) => node.userId === userId && node.type === "note",
  );
  const sortedNotes = [...notes].sort(
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );

  for (const note of sortedNotes) {
    const key = note.title.trim().toLowerCase();
    if (!normalizedSet.has(key)) {
      continue;
    }
    if (!resolvedMap.has(key)) {
      resolvedMap.set(key, note.id);
    }
  }

  const desiredTargets = new Set<string>();
  const unresolved: string[] = [];

  for (const title of titles) {
    const targetId = resolvedMap.get(title.toLowerCase());
    if (!targetId || targetId === noteId) {
      unresolved.push(title);
      continue;
    }
    desiredTargets.add(targetId);
  }

  const existing = Array.from(edgesCollection.state.values()).filter(
    (edge) => edge.userId === userId && edge.sourceId === noteId && edge.type === "embeds",
  );
  const existingByTarget = new Map(existing.map((row) => [row.targetId, row.id]));
  const now = new Date();

  for (const targetId of desiredTargets) {
    if (existingByTarget.has(targetId)) {
      continue;
    }
    edgesCollection.insert({
      id: ulid(),
      userId,
      sourceId: noteId,
      targetId,
      type: "embeds",
      createdAt: now,
    });
  }

  const toDelete = existing.filter((row) => !desiredTargets.has(row.targetId)).map((row) => row.id);
  if (toDelete.length > 0) {
    edgesCollection.delete(toDelete);
  }

  return {
    resolved: Array.from(desiredTargets),
    unresolved,
  };
}
