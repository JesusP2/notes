import { useCallback } from "react";
import { useLiveQuery, usePGlite } from "@electric-sql/pglite-react";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ulid } from "ulidx";
import type { Edge, EdgeType, Node, NodeType } from "@/db/schema/graph";

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
      id,
      type,
      title,
      content,
      color,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM nodes
  `;
}

function edgesSelect() {
  return sql`
    SELECT
      id,
      source_id AS "sourceId",
      target_id AS "targetId",
      type,
      created_at AS "createdAt"
    FROM edges
  `;
}

export function useFolderChildren(folderId: string): Node[] {
  const query = sql`
    ${nodesSelect()}
    JOIN edges e ON nodes.id = e.source_id
    WHERE e.target_id = ${folderId} AND e.type = 'part_of'
    ORDER BY
      CASE nodes.type WHEN 'folder' THEN 0 ELSE 1 END,
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

export function useNodeEdges(nodeId: string): { outgoing: Edge[]; incoming: Edge[] } {
  const outgoingQuery = sql`
    ${edgesSelect()}
    WHERE source_id = ${nodeId}
  `;
  const incomingQuery = sql`
    ${edgesSelect()}
    WHERE target_id = ${nodeId}
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
    WHERE type = 'tag'
    ORDER BY LOWER(title) ASC
  `;
  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useTaggedNotes(tagId: string): Node[] {
  const query = sql`
    ${nodesSelect()}
    JOIN edges e ON nodes.id = e.source_id
    WHERE e.target_id = ${tagId} AND e.type = 'tagged_with'
    ORDER BY LOWER(nodes.title) ASC
  `;
  const { sql: sqlString, params } = sqlToQuery(query);
  const result = useLiveQuery<Node>(sqlString, params);

  return result?.rows ?? [];
}

export function useNodeMutations() {
  const db = usePGlite();

  const createNode = useCallback(
    async (type: NodeType, title: string) => {
      const id = ulid();
      const result = await db.query<Node>(
        `INSERT INTO nodes (id, type, title, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING
           id,
           type,
           title,
           content,
           color,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [id, type, title],
      );
      return result.rows[0];
    },
    [db],
  );

  const createNote = useCallback(
    async (title: string, parentFolderId: string) => {
      const node = await createNode("note", title);
      await db.query(
        `INSERT INTO edges (id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (source_id, target_id, type) DO NOTHING`,
        [ulid(), node.id, parentFolderId],
      );
      return node;
    },
    [createNode, db],
  );

  const createFolder = useCallback(
    async (title: string, parentFolderId: string) => {
      const node = await createNode("folder", title);
      await db.query(
        `INSERT INTO edges (id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (source_id, target_id, type) DO NOTHING`,
        [ulid(), node.id, parentFolderId],
      );
      return node;
    },
    [createNode, db],
  );

  const createTag = useCallback(
    async (title: string) => {
      return createNode("tag", title);
    },
    [createNode],
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
          updates.updatedAt instanceof Date
            ? updates.updatedAt.toISOString()
            : updates.updatedAt;
        fields.push(`updated_at = $${values.length + 1}`);
        values.push(updatedAtValue);
      }

      const sqlText = `UPDATE nodes SET ${fields.join(", ")} WHERE id = $${
        values.length + 1
      }`;
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

  const moveNode = useCallback(
    async (nodeId: string, newParentId: string) => {
      await db.query("DELETE FROM edges WHERE source_id = $1 AND type = 'part_of'", [nodeId]);
      await db.query(
        `INSERT INTO edges (id, source_id, target_id, type, created_at)
         VALUES ($1, $2, $3, 'part_of', CURRENT_TIMESTAMP)
         ON CONFLICT (source_id, target_id, type) DO NOTHING`,
        [ulid(), nodeId, newParentId],
      );
    },
    [db],
  );

  return {
    createNote,
    createFolder,
    createTag,
    updateNode,
    deleteNode,
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
