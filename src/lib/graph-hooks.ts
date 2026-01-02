import { useLiveQuery, usePGlite } from "@electric-sql/pglite-react";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { useCallback } from "react";
import { ulid } from "ulidx";
import type { Edge, EdgeType, Node } from "@/db/schema/graph";

const dialect = new PgDialect();

function sqlToQuery(query: ReturnType<typeof sql>) {
  const compiled = dialect.sqlToQuery(query);
  return {
    sql: compiled.sql,
    params: compiled.params as unknown[],
  };
}

function nodesSelect() {
  return sql`
    SELECT
      nodes.id AS id,
      nodes.type AS type,
      nodes.title AS title,
      nodes.content AS content,
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
      edges.source_id AS "sourceId",
      edges.target_id AS "targetId",
      edges.type AS type,
      edges.created_at AS "createdAt"
    FROM edges
  `;
}

export function useTagChildren(tagId: string): Node[] {
  const query = sql`
    ${nodesSelect()}
    JOIN edges e ON nodes.id = e.source_id
    WHERE e.target_id = ${tagId} AND e.type = 'part_of'
    ORDER BY
      CASE nodes.type WHEN 'tag' THEN 0 ELSE 1 END,
      LOWER(nodes.title) ASC
  `;

  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useNodeById(nodeId: string): Node | null {
  const query = sql`
    ${nodesSelect()}
    WHERE id = ${nodeId}
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
  const outgoingQuery = sql`
    ${edgesSelect()}
    WHERE edges.source_id = ${nodeId}
  `;
  const incomingQuery = sql`
    ${edgesSelect()}
    WHERE edges.target_id = ${nodeId}
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
  const nodesQuery = sql`
    ${nodesSelect()}
  `;
  const edgesQuery = sql`
    ${edgesSelect()}
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
  const trimmed = queryText.trim();
  const query = trimmed
    ? sql`
        ${nodesSelect()}
        WHERE title ILIKE ${"%" + trimmed + "%"}
           OR content ILIKE ${"%" + trimmed + "%"}
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

export function useTags(): Node[] {
  const query = sql`
    ${nodesSelect()}
    WHERE nodes.type = 'tag'
    ORDER BY LOWER(title) ASC
  `;
  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useParentTags(nodeId: string): Node[] {
  const query = sql`
    ${nodesSelect()}
    JOIN edges e ON nodes.id = e.target_id
    WHERE e.source_id = ${nodeId} AND e.type = 'part_of' AND nodes.type = 'tag'
    ORDER BY LOWER(nodes.title) ASC
  `;
  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useNodeMutations() {
  const db = usePGlite();

  const createNote = useCallback(
    async (title: string, parentTagId: string) => {
      const id = ulid();
      const content = `# ${title}\n\n`;
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, type, title, content, created_at, updated_at)
         VALUES ($1, 'note', $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           type,
           title,
           content,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, title, content],
      );
      const node = result.rows[0];
      await db.query(
        `INSERT INTO edges (id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (source_id, target_id, type) DO NOTHING`,
        [ulid(), node.id, parentTagId],
      );
      return node;
    },
    [db],
  );

  const createTag = useCallback(
    async (title: string, parentTagId?: string) => {
      const id = ulid();
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, type, title, created_at, updated_at)
         VALUES ($1, 'tag', $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           type,
           title,
           content,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, title],
      );
      const node = result.rows[0];
      if (parentTagId) {
        await db.query(
          `INSERT INTO edges (id, source_id, target_id, type, created_at)
           VALUES ($1, $2, $3, 'part_of', CURRENT_TIMESTAMP)
           ON CONFLICT (source_id, target_id, type) DO NOTHING`,
          [ulid(), node.id, parentTagId],
        );
      }
      return node;
    },
    [db],
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

      const sqlText = `UPDATE nodes SET ${fields.join(", ")} WHERE id = $${values.length + 1}`;
      await db.query(sqlText, [...values, id]);
    },
    [db],
  );

  const deleteNode = useCallback(
    async (id: string) => {
      await db.query("DELETE FROM nodes WHERE id = $1", [id]);
    },
    [db],
  );

  const addParent = useCallback(
    async (nodeId: string, parentTagId: string) => {
      await db.query(
        `INSERT INTO edges (id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (source_id, target_id, type) DO NOTHING`,
        [ulid(), nodeId, parentTagId],
      );
    },
    [db],
  );

  const removeParent = useCallback(
    async (nodeId: string, parentTagId: string) => {
      await db.query(
        "DELETE FROM edges WHERE source_id = $1 AND target_id = $2 AND type = 'part_of'",
        [nodeId, parentTagId],
      );
    },
    [db],
  );

  const moveNode = useCallback(
    async (nodeId: string, newParentTagId: string) => {
      await db.query("DELETE FROM edges WHERE source_id = $1 AND type = 'part_of'", [nodeId]);
      await db.query(
        `INSERT INTO edges (id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (source_id, target_id, type) DO NOTHING`,
        [ulid(), nodeId, newParentTagId],
      );
    },
    [db],
  );

  return {
    createNote,
    createTag,
    updateNode,
    deleteNode,
    addParent,
    removeParent,
    moveNode,
  };
}

export function useEdgeMutations() {
  const db = usePGlite();

  const createEdge = useCallback(
    async (sourceId: string, targetId: string, type: EdgeType) => {
      const id = ulid();
      const result = await db.query<Edge>(
        `INSERT INTO edges (id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING
           id,
           source_id AS "sourceId",
           target_id AS "targetId",
           type,
           created_at AS "createdAt"`,
        [id, sourceId, targetId, type],
      );
      return result.rows[0];
    },
    [db],
  );

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      await db.query("DELETE FROM edges WHERE id = $1", [edgeId]);
    },
    [db],
  );

  const changeEdgeType = useCallback(
    async (edgeId: string, newType: EdgeType) => {
      await db.query("UPDATE edges SET type = $1 WHERE id = $2", [newType, edgeId]);
    },
    [db],
  );

  return {
    createEdge,
    deleteEdge,
    changeEdgeType,
  };
}
