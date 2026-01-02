import type { PGlite } from "@electric-sql/pglite";
import { ulid } from "ulidx";
import type { Node } from "@/db/schema/graph";

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

type QueryableDb = Pick<PGlite, "query">;

export async function syncWikiLinks({
  db,
  noteId,
  userId,
  content,
}: {
  db: QueryableDb;
  noteId: string;
  userId: string;
  content: string;
}): Promise<{ resolved: string[]; unresolved: string[] }> {
  const titles = extractWikiLinks(content);
  const normalized = titles.map((title) => title.toLowerCase());
  const resolvedMap = new Map<string, string>();

  if (normalized.length > 0) {
    const placeholders = normalized.map((_, index) => `$${index + 1}`).join(", ");
    const result = await db.query<{ id: string; title: string }>(
      `SELECT id, title
       FROM nodes
       WHERE type = 'note'
         AND user_id = $${normalized.length + 1}
         AND LOWER(title) IN (${placeholders})
       ORDER BY updated_at DESC`,
      [...normalized, userId],
    );

    for (const row of result.rows) {
      const key = row.title.trim().toLowerCase();
      if (!resolvedMap.has(key)) {
        resolvedMap.set(key, row.id);
      }
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

  const existing = await db.query<{ id: string; target_id: string }>(
    "SELECT id, target_id FROM edges WHERE source_id = $1 AND type = 'references' AND user_id = $2",
    [noteId, userId],
  );

  const existingByTarget = new Map(existing.rows.map((row) => [row.target_id, row.id]));

  for (const targetId of desiredTargets) {
    if (existingByTarget.has(targetId)) {
      continue;
    }
    await db.query(
      `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
       VALUES ($1, $2, $3, $4, 'references', CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
      [ulid(), userId, noteId, targetId],
    );
  }

  for (const row of existing.rows) {
    if (desiredTargets.has(row.target_id)) {
      continue;
    }
    await db.query("DELETE FROM edges WHERE id = $1", [row.id]);
  }

  return {
    resolved: Array.from(desiredTargets),
    unresolved,
  };
}

export async function syncEmbeds({
  db,
  noteId,
  userId,
  content,
}: {
  db: QueryableDb;
  noteId: string;
  userId: string;
  content: string;
}): Promise<{ resolved: string[]; unresolved: string[] }> {
  const titles = extractEmbeds(content);
  const normalized = titles.map((title) => title.toLowerCase());
  const resolvedMap = new Map<string, string>();

  if (normalized.length > 0) {
    const placeholders = normalized.map((_, index) => `$${index + 1}`).join(", ");
    const result = await db.query<{ id: string; title: string }>(
      `SELECT id, title
       FROM nodes
       WHERE type = 'note'
         AND user_id = $${normalized.length + 1}
         AND LOWER(title) IN (${placeholders})
       ORDER BY updated_at DESC`,
      [...normalized, userId],
    );

    for (const row of result.rows) {
      const key = row.title.trim().toLowerCase();
      if (!resolvedMap.has(key)) {
        resolvedMap.set(key, row.id);
      }
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

  const existing = await db.query<{ id: string; target_id: string }>(
    "SELECT id, target_id FROM edges WHERE source_id = $1 AND type = 'embeds' AND user_id = $2",
    [noteId, userId],
  );

  const existingByTarget = new Map(existing.rows.map((row) => [row.target_id, row.id]));

  for (const targetId of desiredTargets) {
    if (existingByTarget.has(targetId)) {
      continue;
    }
    await db.query(
      `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
       VALUES ($1, $2, $3, $4, 'embeds', CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
      [ulid(), userId, noteId, targetId],
    );
  }

  for (const row of existing.rows) {
    if (desiredTargets.has(row.target_id)) {
      continue;
    }
    await db.query("DELETE FROM edges WHERE id = $1", [row.id]);
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
