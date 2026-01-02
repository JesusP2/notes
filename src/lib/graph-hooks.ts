import { useLiveQuery, usePGlite } from "@electric-sql/pglite-react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { useCallback } from "react";
import { ulid } from "ulidx";
import type { Edge, EdgeType, Node } from "@/db/schema/graph";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { hashContent } from "@/lib/content-hash";
import { buildNoteExcerpt } from "@/lib/note-excerpt";
import { applyTemplatePlaceholders } from "@/lib/templates";

const dialect = new PgDialect();

function sqlToQuery(query: ReturnType<typeof sql>) {
  const compiled = dialect.sqlToQuery(query);
  return {
    sql: compiled.sql,
    params: compiled.params as unknown[],
  };
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function normalizeCanvasAppState(appState: AppState | null | undefined): AppState {
  const next = { ...(appState ?? {}) } as AppState & { collaborators?: unknown };
  if (!(next.collaborators instanceof Map)) {
    next.collaborators = new Map();
  }
  return next;
}

function stripCanvasAppStateForStorage(
  appState: AppState | null | undefined,
): Partial<AppState> {
  if (!appState) return {};
  const { collaborators, ...rest } = appState as AppState & { collaborators?: unknown };
  return rest;
}

function nodesSelect() {
  return sql`
    SELECT
      nodes.id AS id,
      nodes.user_id AS "userId",
      nodes.type AS type,
      nodes.title AS title,
      nodes.content AS content,
      nodes.excerpt AS excerpt,
      nodes.color AS color,
      nodes.created_at AS "createdAt",
      nodes.updated_at AS "updatedAt"
    FROM nodes
  `;
}

function edgesSelect() {
  return sql`
    SELECT
      edges.id AS id,
      edges.user_id AS "userId",
      edges.source_id AS "sourceId",
      edges.target_id AS "targetId",
      edges.type AS type,
      edges.created_at AS "createdAt"
    FROM edges
  `;
}

export function useTagChildren(tagId: string): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    JOIN edges e ON nodes.id = e.source_id
    WHERE nodes.user_id = ${userId}
      AND e.user_id = ${userId}
      AND e.target_id = ${tagId}
      AND (
        (e.type = 'part_of' AND nodes.type = 'tag')
        OR (e.type = 'tagged_with' AND nodes.type IN ('note', 'canvas'))
      )
    ORDER BY
      CASE nodes.type WHEN 'tag' THEN 0 ELSE 1 END,
      LOWER(nodes.title) ASC
  `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useNodeById(nodeId: string): Node | null {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    WHERE id = ${nodeId} AND nodes.user_id = ${userId}
    LIMIT 1
  `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows[0] ?? null;
}

export function useNodeEdges(nodeId: string): {
  outgoing: Edge[];
  incoming: Edge[];
} {
  const userId = useCurrentUserId();
  const outgoingQuery = sql`
    ${edgesSelect()}
    WHERE edges.source_id = ${nodeId} AND edges.user_id = ${userId}
  `;
  const incomingQuery = sql`
    ${edgesSelect()}
    WHERE edges.target_id = ${nodeId} AND edges.user_id = ${userId}
  `;

  const outgoingCompiled = sqlToQuery(outgoingQuery);
  const incomingCompiled = sqlToQuery(incomingQuery);

  const outgoing = useLiveQuery<Edge>(outgoingCompiled.sql, outgoingCompiled.params);
  const incoming = useLiveQuery<Edge>(incomingCompiled.sql, incomingCompiled.params);

  return {
    outgoing: outgoing?.rows ?? [],
    incoming: incoming?.rows ?? [],
  };
}

export function useGraphData(): { nodes: Node[]; edges: Edge[] } {
  const userId = useCurrentUserId();
  const nodesQuery = sql`
    ${nodesSelect()}
    WHERE nodes.user_id = ${userId}
  `;
  const edgesQuery = sql`
    ${edgesSelect()}
    WHERE edges.user_id = ${userId}
  `;

  const nodesCompiled = sqlToQuery(nodesQuery);
  const edgesCompiled = sqlToQuery(edgesQuery);

  const nodesResult = useLiveQuery<Node>(nodesCompiled.sql, nodesCompiled.params);
  const edgesResult = useLiveQuery<Edge>(edgesCompiled.sql, edgesCompiled.params);

  return {
    nodes: nodesResult?.rows ?? [],
    edges: edgesResult?.rows ?? [],
  };
}

export function useSearchNodes(queryText: string): Node[] {
  const userId = useCurrentUserId();
  const trimmed = queryText.trim();
  const query = trimmed
    ? sql`
        ${nodesSelect()}
        WHERE nodes.user_id = ${userId}
          AND (
            title ILIKE ${"%" + trimmed + "%"}
            OR content ILIKE ${"%" + trimmed + "%"}
          )
        ORDER BY updated_at DESC
        LIMIT 20
      `
    : sql`
        ${nodesSelect()}
        WHERE 1 = 0
      `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useRecentNotes(limit = 10): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    WHERE nodes.user_id = ${userId} AND nodes.type = 'note'
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useBacklinks(noteId: string): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    JOIN edges e ON nodes.id = e.source_id
    WHERE e.target_id = ${noteId}
      AND e.type = 'references'
      AND e.user_id = ${userId}
      AND nodes.user_id = ${userId}
    ORDER BY nodes.updated_at DESC
  `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useTags(): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    WHERE nodes.user_id = ${userId} AND nodes.type = 'tag'
    ORDER BY LOWER(title) ASC
  `;
  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useTemplates(): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    WHERE nodes.user_id = ${userId} AND nodes.type = 'template'
    ORDER BY LOWER(title) ASC
  `;
  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useNoteTags(nodeId: string): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    JOIN edges e ON nodes.id = e.target_id
    WHERE e.source_id = ${nodeId}
      AND e.type = 'tagged_with'
      AND nodes.type = 'tag'
      AND e.user_id = ${userId}
      AND nodes.user_id = ${userId}
    ORDER BY LOWER(nodes.title) ASC
  `;
  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function usePinnedNotes(): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    JOIN user_node_prefs p ON nodes.id = p.node_id
    WHERE nodes.user_id = ${userId}
      AND p.user_id = ${userId}
      AND nodes.type = 'note'
      AND p.pinned_rank IS NOT NULL
    ORDER BY p.pinned_rank ASC
  `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useFavoriteNotes(): Node[] {
  const userId = useCurrentUserId();
  const query = sql`
    ${nodesSelect()}
    JOIN user_node_prefs p ON nodes.id = p.node_id
    WHERE nodes.user_id = ${userId}
      AND p.user_id = ${userId}
      AND nodes.type = 'note'
      AND p.is_favorite = true
    ORDER BY nodes.updated_at DESC
  `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useNodePreferences(nodeId: string): {
  isFavorite: boolean;
  pinnedRank: number | null;
} {
  const userId = useCurrentUserId();
  const result = useLiveQuery<{ is_favorite: boolean; pinned_rank: number | null }>(
    "SELECT is_favorite, pinned_rank FROM user_node_prefs WHERE user_id = $1 AND node_id = $2 LIMIT 1",
    [userId, nodeId],
  );

  const row = result?.rows[0];
  return {
    isFavorite: row?.is_favorite ?? false,
    pinnedRank: row?.pinned_rank ?? null,
  };
}

export function useNoteVersions(noteId: string): Array<{
  id: string;
  title: string;
  content: string;
  contentHash: string;
  createdAt: Date;
  reason: string | null;
}> {
  const userId = useCurrentUserId();
  const result = useLiveQuery<{
    id: string;
    title: string;
    content: string;
    content_hash: string;
    created_at: string | Date;
    reason: string | null;
  }>(
    `SELECT id, title, content, content_hash, created_at, reason
     FROM node_versions
     WHERE user_id = $1 AND node_id = $2
     ORDER BY created_at DESC`,
    [userId, noteId],
  );

  return (
    result?.rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      contentHash: row.content_hash,
      createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      reason: row.reason ?? null,
    })) ?? []
  );
}

export function useVersionMutations() {
  const db = usePGlite();
  const userId = useCurrentUserId();

  const createNoteVersion = useCallback(
    async (noteId: string, title: string, content: string, reason?: string) => {
      const hash = hashContent(`${title}\n${content}`);
      const existing = await db.query<{ id: string }>(
        "SELECT id FROM node_versions WHERE user_id = $1 AND node_id = $2 AND content_hash = $3 LIMIT 1",
        [userId, noteId, hash],
      );
      if (existing.rows.length > 0) return false;

      await db.query(
        `INSERT INTO node_versions (id, user_id, node_id, title, content, content_hash, created_at, created_by, reason)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)`,
        [ulid(), userId, noteId, title, content, hash, userId, reason ?? null],
      );
      return true;
    },
    [db, userId],
  );

  return { createNoteVersion };
}

export type TaskItem = {
  id: string;
  noteId: string;
  content: string;
  isDone: boolean;
  position: number | null;
  noteTitle: string;
};

export function useTasks(options: { showDone?: boolean } = {}): TaskItem[] {
  const userId = useCurrentUserId();
  const { showDone = true } = options;
  const result = useLiveQuery<{
    id: string;
    note_id: string;
    content: string;
    is_done: boolean;
    position: number | null;
    note_title: string;
  }>(
    `SELECT
       tasks.id,
       tasks.note_id,
       tasks.content,
       tasks.is_done,
       tasks.position,
       nodes.title AS note_title
     FROM tasks
     JOIN nodes ON nodes.id = tasks.note_id
     WHERE tasks.user_id = $1 AND nodes.user_id = $2
       ${showDone ? "" : "AND tasks.is_done = false"}
     ORDER BY tasks.is_done ASC, tasks.due_at ASC NULLS LAST, tasks.position ASC`,
    [userId, userId],
  );

  return (
    result?.rows.map((row) => ({
      id: row.id,
      noteId: row.note_id,
      content: row.content,
      isDone: row.is_done,
      position: row.position,
      noteTitle: row.note_title,
    })) ?? []
  );
}

export function useTaskMutations() {
  const db = usePGlite();
  const userId = useCurrentUserId();

  const toggleTask = useCallback(
    async (taskId: string, nextDone?: boolean) => {
      const taskResult = await db.query<{
        id: string;
        note_id: string;
        position: number | null;
        is_done: boolean;
      }>("SELECT id, note_id, position, is_done FROM tasks WHERE id = $1 AND user_id = $2", [
        taskId,
        userId,
      ]);
      const task = taskResult.rows[0];
      if (!task) return;

      const noteResult = await db.query<{ content: string | null }>(
        "SELECT content FROM nodes WHERE id = $1 AND user_id = $2",
        [task.note_id, userId],
      );
      const content = noteResult.rows[0]?.content ?? "";
      const lines = content.split(/\r?\n/);
      const index = task.position ?? -1;
      if (index < 0 || index >= lines.length) return;

      const desiredDone = nextDone ?? !task.is_done;
      const line = lines[index] ?? "";
      const updatedLine = line.replace(/\[[ xX]\]/, desiredDone ? "[x]" : "[ ]");
      lines[index] = updatedLine;
      const nextContent = lines.join("\n");

      await db.query(
        `UPDATE nodes
         SET content = $1,
             excerpt = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4`,
        [nextContent, buildNoteExcerpt(nextContent), task.note_id, userId],
      );

      await db.query(
        `UPDATE tasks
         SET is_done = $1,
             checked_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3`,
        [desiredDone, taskId, userId],
      );
    },
    [db, userId],
  );

  return { toggleTask };
}

export function usePreferenceMutations() {
  const db = usePGlite();
  const userId = useCurrentUserId();

  const setFavorite = useCallback(
    async (nodeId: string, isFavorite: boolean) => {
      await db.query(
        `INSERT INTO user_node_prefs (id, user_id, node_id, is_favorite, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, node_id) DO UPDATE
         SET is_favorite = EXCLUDED.is_favorite,
             updated_at = CURRENT_TIMESTAMP`,
        [ulid(), userId, nodeId, isFavorite],
      );
    },
    [db, userId],
  );

  const pinNode = useCallback(
    async (nodeId: string) => {
      const result = await db.query<{ next_rank: number }>(
        "SELECT COALESCE(MAX(pinned_rank), 0) + 1 AS next_rank FROM user_node_prefs WHERE user_id = $1",
        [userId],
      );
      const nextRank = result.rows[0]?.next_rank ?? 1;
      await db.query(
        `INSERT INTO user_node_prefs (id, user_id, node_id, pinned_rank, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, node_id) DO UPDATE
         SET pinned_rank = EXCLUDED.pinned_rank,
             updated_at = CURRENT_TIMESTAMP`,
        [ulid(), userId, nodeId, nextRank],
      );
    },
    [db, userId],
  );

  const unpinNode = useCallback(
    async (nodeId: string) => {
      await db.query(
        "UPDATE user_node_prefs SET pinned_rank = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND node_id = $2",
        [userId, nodeId],
      );
    },
    [db, userId],
  );

  return { setFavorite, pinNode, unpinNode };
}

export function useNodeMutations() {
  const db = usePGlite();
  const userId = useCurrentUserId();

  const createNote = useCallback(
    async (title: string, tagId?: string) => {
      const id = ulid();
      const content = `# ${title}\n\n`;
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, user_id, type, title, content, created_at, updated_at)
         VALUES ($1, $2, 'note', $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           user_id AS "userId",
           type,
           title,
           content,
           excerpt,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, userId, title, content],
      );
      const node = result.rows[0];
      if (tagId) {
        await db.query(
          `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
           VALUES ($1, $2, $3, $4, 'tagged_with', CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
          [ulid(), userId, node.id, tagId],
        );
      }
      return node;
    },
    [db, userId],
  );

  const createTag = useCallback(
    async (title: string, parentTagId: string) => {
      const id = ulid();
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, user_id, type, title, created_at, updated_at)
         VALUES ($1, $2, 'tag', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           user_id AS "userId",
           type,
           title,
           content,
           excerpt,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, userId, title],
      );
      const node = result.rows[0];
      await db.query(
        `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, $4, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
        [ulid(), userId, node.id, parentTagId],
      );
      return node;
    },
    [db, userId],
  );

  const createTemplate = useCallback(
    async (title: string) => {
      const id = ulid();
      const content = `# ${title}\n\n`;
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, user_id, type, title, content, created_at, updated_at)
         VALUES ($1, $2, 'template', $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           user_id AS "userId",
           type,
           title,
           content,
           excerpt,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, userId, title, content],
      );
      return result.rows[0];
    },
    [db, userId],
  );

  const createCanvas = useCallback(
    async (title: string, tagId?: string) => {
      const id = ulid();
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, user_id, type, title, created_at, updated_at)
         VALUES ($1, $2, 'canvas', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           user_id AS "userId",
           type,
           title,
           content,
           excerpt,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, userId, title],
      );

      await db.query(
        `INSERT INTO canvas_scenes (canvas_id, user_id, elements_json, app_state_json, files_json, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (canvas_id) DO NOTHING`,
        [id, userId, JSON.stringify([]), JSON.stringify({}), JSON.stringify({})],
      );

      if (tagId) {
        await db.query(
          `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
           VALUES ($1, $2, $3, $4, 'tagged_with', CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
          [ulid(), userId, id, tagId],
        );
      }

      return result.rows[0];
    },
    [db, userId],
  );

  const createNoteFromTemplate = useCallback(
    async (templateId: string, noteTitle?: string, tagId?: string) => {
      const templateResult = await db.query<Node>(
        `SELECT
           id,
           user_id AS "userId",
           type,
           title,
           content,
           excerpt,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM nodes
         WHERE id = $1 AND user_id = $2 AND type = 'template'
         LIMIT 1`,
        [templateId, userId],
      );

      const template = templateResult.rows[0];
      if (!template) return null;

      const title = noteTitle?.trim() || template.title;
      const baseContent = template.content ?? `# ${title}\n\n`;
      const content = applyTemplatePlaceholders(baseContent, title);
      const excerpt = buildNoteExcerpt(content);

      const noteId = ulid();
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, user_id, type, title, content, excerpt, created_at, updated_at)
         VALUES ($1, $2, 'note', $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           user_id AS "userId",
           type,
           title,
           content,
           excerpt,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [noteId, userId, title, content, excerpt],
      );

      const note = result.rows[0];

      await db.query(
        `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, $4, 'derived_from', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
        [ulid(), userId, noteId, templateId],
      );

      if (tagId) {
        await db.query(
          `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
           VALUES ($1, $2, $3, $4, 'tagged_with', CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
          [ulid(), userId, noteId, tagId],
        );
      }

      await db.query(
        `INSERT INTO templates_meta (node_id, user_id, last_used_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (node_id) DO UPDATE
         SET last_used_at = EXCLUDED.last_used_at`,
        [templateId, userId],
      );

      return note;
    },
    [db, userId],
  );

  const updateNode = useCallback(
    async (id: string, updates: Partial<Node>) => {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (updates.title !== undefined) {
        fields.push(`title = $${values.length + 1}`);
        values.push(updates.title);
      }
      if (updates.content !== undefined) {
        fields.push(`content = $${values.length + 1}`);
        values.push(updates.content);
      }
      if (updates.excerpt !== undefined) {
        fields.push(`excerpt = $${values.length + 1}`);
        values.push(updates.excerpt);
      }
      if (updates.color !== undefined) {
        fields.push(`color = $${values.length + 1}`);
        values.push(updates.color);
      }
      if (updates.type !== undefined) {
        fields.push(`type = $${values.length + 1}`);
        values.push(updates.type);
      }

      if (!fields.length && updates.updatedAt === undefined) {
        return;
      }

      if (updates.updatedAt === undefined) {
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
      } else {
        const updatedAtValue =
          updates.updatedAt instanceof Date ? updates.updatedAt.toISOString() : updates.updatedAt;
        fields.push(`updated_at = $${values.length + 1}`);
        values.push(updatedAtValue);
      }

      const sqlText = `UPDATE nodes SET ${fields.join(", ")} WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}`;
      await db.query(sqlText, [...values, id, userId]);
    },
    [db, userId],
  );

  const deleteNode = useCallback(
    async (id: string) => {
      await db.query("DELETE FROM nodes WHERE id = $1 AND user_id = $2", [id, userId]);
    },
    [db, userId],
  );

  const addTag = useCallback(
    async (noteId: string, tagId: string) => {
      await db.query(
        `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, $4, 'tagged_with', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
        [ulid(), userId, noteId, tagId],
      );
    },
    [db, userId],
  );

  const removeTag = useCallback(
    async (noteId: string, tagId: string) => {
      await db.query(
        "DELETE FROM edges WHERE user_id = $1 AND source_id = $2 AND target_id = $3 AND type = 'tagged_with'",
        [userId, noteId, tagId],
      );
    },
    [db, userId],
  );

  const moveTag = useCallback(
    async (tagId: string, newParentTagId: string) => {
      await db.query(
        "DELETE FROM edges WHERE user_id = $1 AND source_id = $2 AND type = 'part_of'",
        [userId, tagId],
      );
      await db.query(
        `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, $4, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, source_id, target_id, type) DO NOTHING`,
        [ulid(), userId, tagId, newParentTagId],
      );
    },
    [db, userId],
  );

  return {
    createNote,
    createTag,
    createTemplate,
    createCanvas,
    createNoteFromTemplate,
    updateNode,
    deleteNode,
    addTag,
    removeTag,
    moveTag,
  };
}

export function useEdgeMutations() {
  const db = usePGlite();
  const userId = useCurrentUserId();

  const createEdge = useCallback(
    async (sourceId: string, targetId: string, type: EdgeType) => {
      const id = ulid();
      const result = await db.query<Edge>(
        `INSERT INTO edges (id, user_id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING
           id,
           user_id AS "userId",
           source_id AS "sourceId",
           target_id AS "targetId",
           type,
           created_at AS "createdAt"`,
        [id, userId, sourceId, targetId, type],
      );
      return result.rows[0];
    },
    [db, userId],
  );

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      await db.query("DELETE FROM edges WHERE id = $1 AND user_id = $2", [edgeId, userId]);
    },
    [db, userId],
  );

  const changeEdgeType = useCallback(
    async (edgeId: string, newType: EdgeType) => {
      await db.query("UPDATE edges SET type = $1 WHERE id = $2 AND user_id = $3", [
        newType,
        edgeId,
        userId,
      ]);
    },
    [db, userId],
  );

  return {
    createEdge,
    deleteEdge,
    changeEdgeType,
  };
}

export type CanvasScene = {
  elements: ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export type CanvasLink = {
  id: string;
  canvasId: string;
  elementId: string;
  nodeId: string;
};

export function useCanvasScene(canvasId: string): CanvasScene | null {
  const userId = useCurrentUserId();
  const result = useLiveQuery<{
    elements_json: unknown;
    app_state_json: unknown;
    files_json: unknown;
  }>(
    `SELECT elements_json, app_state_json, files_json
     FROM canvas_scenes
     WHERE canvas_id = $1 AND user_id = $2
     LIMIT 1`,
    [canvasId, userId],
  );

  const row = result?.rows[0];
  if (!row) return null;

  return {
    elements: parseJson<ExcalidrawElement[]>(row.elements_json, []),
    appState: normalizeCanvasAppState(
      parseJson<AppState>(row.app_state_json, {} as AppState),
    ),
    files: parseJson<BinaryFiles>(row.files_json, {} as BinaryFiles),
  };
}

export function useCanvasLinks(canvasId: string): CanvasLink[] {
  const userId = useCurrentUserId();
  const result = useLiveQuery<{
    id: string;
    canvas_id: string;
    element_id: string;
    node_id: string;
  }>(
    `SELECT id, canvas_id, element_id, node_id
     FROM canvas_links
     WHERE canvas_id = $1 AND user_id = $2`,
    [canvasId, userId],
  );

  return (
    result?.rows.map((row) => ({
      id: row.id,
      canvasId: row.canvas_id,
      elementId: row.element_id,
      nodeId: row.node_id,
    })) ?? []
  );
}

export function useCanvasMutations() {
  const db = usePGlite();
  const userId = useCurrentUserId();

  const upsertCanvasScene = useCallback(
    async (canvasId: string, scene: CanvasScene) => {
      const appStateForStorage = stripCanvasAppStateForStorage(scene.appState);
      await db.query(
        `INSERT INTO canvas_scenes (canvas_id, user_id, elements_json, app_state_json, files_json, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (canvas_id) DO UPDATE
         SET elements_json = EXCLUDED.elements_json,
             app_state_json = EXCLUDED.app_state_json,
             files_json = EXCLUDED.files_json,
             updated_at = CURRENT_TIMESTAMP`,
        [
          canvasId,
          userId,
          JSON.stringify(scene.elements ?? []),
          JSON.stringify(appStateForStorage),
          JSON.stringify(scene.files ?? {}),
        ],
      );
    },
    [db, userId],
  );

  const setCanvasLink = useCallback(
    async (canvasId: string, elementId: string, nodeId: string) => {
      await db.query(
        "DELETE FROM canvas_links WHERE user_id = $1 AND canvas_id = $2 AND element_id = $3",
        [userId, canvasId, elementId],
      );
      await db.query(
        `INSERT INTO canvas_links (id, user_id, canvas_id, element_id, node_id, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [ulid(), userId, canvasId, elementId, nodeId],
      );
    },
    [db, userId],
  );

  const removeCanvasLink = useCallback(
    async (canvasId: string, elementId: string) => {
      await db.query(
        "DELETE FROM canvas_links WHERE user_id = $1 AND canvas_id = $2 AND element_id = $3",
        [userId, canvasId, elementId],
      );
    },
    [db, userId],
  );

  const pruneCanvasLinks = useCallback(
    async (canvasId: string, elementIds: string[]) => {
      if (elementIds.length === 0) {
        await db.query("DELETE FROM canvas_links WHERE user_id = $1 AND canvas_id = $2", [
          userId,
          canvasId,
        ]);
        return;
      }

      const placeholders = elementIds.map((_, index) => `$${index + 3}`).join(", ");
      await db.query(
        `DELETE FROM canvas_links
         WHERE user_id = $1
           AND canvas_id = $2
           AND element_id NOT IN (${placeholders})`,
        [userId, canvasId, ...elementIds],
      );
    },
    [db, userId],
  );

  return { upsertCanvasScene, setCanvasLink, removeCanvasLink, pruneCanvasLinks };
}
