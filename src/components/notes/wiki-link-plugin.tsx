import { ulid } from "ulidx";
import type { Node } from "@/db/schema/graph";
import { edgesCollection, nodesCollection } from "@/lib/collections";

const WIKI_LINK_REGEX = /\[\[([^[\]]+)\]\]/g;
export const EMBED_LINK_REGEX = /!\[\[([^[\]]+)\]\]/g;
const RESOLVED_CLASS = "wiki-link wiki-link-resolved text-sky-600 underline underline-offset-2";
const UNRESOLVED_CLASS =
  "wiki-link wiki-link-unresolved text-muted-foreground border-b border-dashed border-muted-foreground/60";

export function extractWikiLinks(content: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(WIKI_LINK_REGEX)) {
    const matchIndex = match.index ?? -1;
    if (matchIndex > 0 && content[matchIndex - 1] === "!") {
      continue;
    }
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

export function renderWikiLinks(content: string, linkTargets: Record<string, string> = {}): string {
  if (!content) {
    return "";
  }

  return content.replace(WIKI_LINK_REGEX, (match, rawTitle, offset, source) => {
    if (typeof offset === "number" && offset > 0 && source[offset - 1] === "!") {
      return match;
    }
    const title = String(rawTitle ?? "").trim();
    if (!title) {
      return match;
    }

    const key = title.toLowerCase();
    const targetId = linkTargets[key];
    const displayTitle = `[[${escapeHtml(title)}]]`;

    if (targetId) {
      return `<a class="${RESOLVED_CLASS}" href="/notes/${targetId}">${displayTitle}</a>`;
    }

    return `<span class="${UNRESOLVED_CLASS}">${displayTitle}</span>`;
  });
}

export function stripEmbeds(content: string): string {
  if (!content) return "";
  return content
    .replace(EMBED_LINK_REGEX, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  const titles = extractWikiLinks(content);
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
