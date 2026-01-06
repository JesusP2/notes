import type { JSONContent } from "@tiptap/core";
import { ulid } from "ulidx";
import type { Node } from "@/db/schema/graph";
import { edgesCollection, nodesCollection } from "@/lib/collections";

export interface WikiLinkInfo {
  noteId: string | null;
  title: string;
}

function extractWikiLinksFromJson(node: JSONContent, results: WikiLinkInfo[], seen: Set<string>): void {
  if (node.type === "wikiLink") {
    const attrs = node.attrs ?? {};
    const noteId = (attrs.noteId as string) || null;
    const title = (attrs.title as string) || "";

    if (title.trim()) {
      const key = title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ noteId, title: title.trim() });
      }
    }
  }

  if (node.content) {
    for (const child of node.content) {
      extractWikiLinksFromJson(child, results, seen);
    }
  }
}

export function extractWikiLinks(content: JSONContent): WikiLinkInfo[] {
  if (!content) return [];

  const results: WikiLinkInfo[] = [];
  const seen = new Set<string>();
  extractWikiLinksFromJson(content, results, seen);
  return results;
}

function extractEmbedsFromJson(node: JSONContent, results: string[], seen: Set<string>): void {
  if (node.type === "image" && node.attrs?.alt) {
    const embedMatch = String(node.attrs.alt).match(/^!\[\[([^\]]+)\]\]$/);
    if (embedMatch) {
      const title = embedMatch[1]?.trim();
      if (title) {
        const key = title.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push(title);
        }
      }
    }
  }

  if (node.content) {
    for (const child of node.content) {
      extractEmbedsFromJson(child, results, seen);
    }
  }
}

export function extractEmbeds(content: JSONContent): string[] {
  if (!content) return [];

  const results: string[] = [];
  const seen = new Set<string>();
  extractEmbedsFromJson(content, results, seen);
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
  content: JSONContent;
}): { resolved: string[]; unresolved: string[] } {
  const wikiLinks = extractWikiLinks(content);

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
  content: JSONContent;
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
