// @vitest-environment jsdom

import { PGliteProvider } from "@electric-sql/pglite-react";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";
import {
  useEdgeMutations,
  useTagChildren,
  useGraphData,
  useNodeById,
  useNodeEdges,
  useNodeMutations,
  useSearchNodes,
  useTags,
} from "./graph-hooks";

function createWrapper(db: Awaited<ReturnType<typeof createTestDb>>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <PGliteProvider db={db}>{children}</PGliteProvider>;
  };
}

describe("useTagChildren", () => {
  it("returns empty array for empty tag", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useTagChildren("root"), {
      wrapper: createWrapper(db),
    });

    try {
      expect(result.current).toEqual([]);
    } finally {
      unmount();
    }
  });

  it("returns direct children only and sorts tags before notes", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useTagChildren("root"), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-z", "tag", "Zoo"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-a", "note", "Alpha"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-nested", "note", "Nested"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-root-tag", "tag-z", "root", "part_of"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-root-note", "note-a", "root", "part_of"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-tag-note", "note-nested", "tag-z", "part_of"],
      );

      await waitFor(() => expect(result.current).toHaveLength(2));
      expect(result.current.map((node) => node.id)).toEqual(["tag-z", "note-a"]);
    } finally {
      unmount();
    }
  });

  it("updates when a child is added and removed", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useTagChildren("root"), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "First"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-1", "note-1", "root", "part_of"],
      );

      await waitFor(() => expect(result.current).toHaveLength(1));

      await db.query("DELETE FROM nodes WHERE id = $1", ["note-1"]);
      await waitFor(() => expect(result.current).toHaveLength(0));
    } finally {
      unmount();
    }
  });
});

describe("useNodeById", () => {
  it("returns null until the node exists", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeById("note-1"), {
      wrapper: createWrapper(db),
    });

    try {
      expect(result.current).toBeNull();

      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "First Note"],
      );

      await waitFor(() => expect(result.current?.id).toBe("note-1"));
    } finally {
      unmount();
    }
  });

  it("returns null after the node is deleted", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeById("note-1"), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Temp Note"],
      );

      await waitFor(() => expect(result.current?.id).toBe("note-1"));

      await db.query("DELETE FROM nodes WHERE id = $1", ["note-1"]);

      await waitFor(() => expect(result.current).toBeNull());
    } finally {
      unmount();
    }
  });
});

describe("useNodeEdges", () => {
  it("returns incoming and outgoing edges", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeEdges("note-1"), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-2", "note", "Note 2"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-3", "note", "Note 3"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-out", "note-1", "note-2", "references"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-in", "note-3", "note-1", "supports"],
      );

      await waitFor(() => expect(result.current.outgoing).toHaveLength(1));
      await waitFor(() => expect(result.current.incoming).toHaveLength(1));

      expect(result.current.outgoing[0]?.id).toBe("edge-out");
      expect(result.current.incoming[0]?.id).toBe("edge-in");
    } finally {
      unmount();
    }
  });

  it("returns empty arrays for a node with no edges", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeEdges("note-1"), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Solo Note"],
      );

      await waitFor(() => expect(result.current.outgoing).toHaveLength(0));
      await waitFor(() => expect(result.current.incoming).toHaveLength(0));
    } finally {
      unmount();
    }
  });
});

describe("useTags", () => {
  it("returns tags sorted by title", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useTags(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-b", "tag", "beta"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-a", "tag", "Alpha"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );

      await waitFor(() => expect(result.current).toHaveLength(3));
      expect(result.current.map((tag) => tag.title)).toEqual(["#root", "Alpha", "beta"]);
    } finally {
      unmount();
    }
  });
});

describe("useSearchNodes", () => {
  it("returns matching nodes by title and content", async () => {
    const db = await createTestDb();
    const { result, rerender, unmount } = renderHook(
      ({ query }: { query: string }) => useSearchNodes(query),
      {
        initialProps: { query: "" },
        wrapper: createWrapper(db),
      },
    );

    try {
      expect(result.current).toEqual([]);

      await db.query(
        "INSERT INTO nodes (id, type, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Alpha Note", "Zebra content"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-2", "note", "Beta Note", "Alpha mention"],
      );

      rerender({ query: "alpha" });

      await waitFor(() => expect(result.current).toHaveLength(2));
      expect(result.current.map((node) => node.id).sort()).toEqual(["note-1", "note-2"]);
    } finally {
      unmount();
    }
  });

  it("returns empty results for an empty query", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useSearchNodes("   "), {
      wrapper: createWrapper(db),
    });

    try {
      expect(result.current).toEqual([]);
    } finally {
      unmount();
    }
  });

  it("orders results by updated_at descending", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useSearchNodes("note"), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
        ["note-old", "note", "Note Old", "note", "2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
        ["note-new", "note", "Note New", "note", "2020-01-02T00:00:00Z", "2020-01-02T00:00:00Z"],
      );

      await waitFor(() => expect(result.current).toHaveLength(2));
      expect(result.current[0]?.id).toBe("note-new");
      expect(result.current[1]?.id).toBe("note-old");
    } finally {
      unmount();
    }
  });
});

describe("useGraphData", () => {
  it("returns nodes and edges", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Graph Note"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-graph", "note-1", "root", "part_of"],
      );

      await waitFor(() => expect(result.current.nodes.map((node) => node.id)).toContain("note-1"));
      await waitFor(() =>
        expect(result.current.edges.map((edge) => edge.id)).toContain("edge-graph"),
      );
    } finally {
      unmount();
    }
  });

  it("includes the seeded root node", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(db),
    });

    try {
      await waitFor(() => expect(result.current.nodes.map((node) => node.id)).toContain("root"));
    } finally {
      unmount();
    }
  });
});

describe("useEdgeMutations", () => {
  it("createEdge inserts an edge row", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-2", "note", "Note 2"],
      );

      let edgeId = "";
      await act(async () => {
        const created = await result.current.createEdge("note-1", "note-2", "references");
        edgeId = created.id;
      });

      const edges = await db.query("SELECT source_id, target_id, type FROM edges WHERE id = $1", [
        edgeId,
      ]);
      expect(edges.rows[0]).toEqual({
        source_id: "note-1",
        target_id: "note-2",
        type: "references",
      });
    } finally {
      unmount();
    }
  });

  it("changeEdgeType updates the edge type", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-2", "note", "Note 2"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-1", "note-1", "note-2", "references"],
      );

      await act(async () => {
        await result.current.changeEdgeType("edge-1", "supports");
      });

      const edges = await db.query<{ type: string }>("SELECT type FROM edges WHERE id = $1", [
        "edge-1",
      ]);
      expect(edges.rows[0]?.type).toBe("supports");
    } finally {
      unmount();
    }
  });

  it("deleteEdge removes the edge row", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-2", "note", "Note 2"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-1", "note-1", "note-2", "references"],
      );

      await act(async () => {
        await result.current.deleteEdge("edge-1");
      });

      const edges = await db.query("SELECT id FROM edges WHERE id = $1", ["edge-1"]);
      expect(edges.rows).toHaveLength(0);
    } finally {
      unmount();
    }
  });

  it("createEdge rejects duplicate edges", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-2", "note", "Note 2"],
      );

      await act(async () => {
        await result.current.createEdge("note-1", "note-2", "references");
      });

      await expect(
        result.current.createEdge("note-1", "note-2", "references"),
      ).rejects.toBeTruthy();
    } finally {
      unmount();
    }
  });
});

describe("useNodeMutations", () => {
  it("createNote creates a node and part_of edge", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      let createdId = "";
      await act(async () => {
        const created = await result.current.createNote("New Note", "root");
        createdId = created.id;
      });

      const nodes = await db.query("SELECT id, type, title FROM nodes WHERE id = $1", [createdId]);
      const edges = await db.query(
        "SELECT source_id, target_id, type FROM edges WHERE source_id = $1",
        [createdId],
      );

      expect(nodes.rows[0]).toEqual({
        id: createdId,
        type: "note",
        title: "New Note",
      });
      expect(edges.rows[0]).toEqual({
        source_id: createdId,
        target_id: "root",
        type: "part_of",
      });
    } finally {
      unmount();
    }
  });

  it("deleteNode removes a note and all its edges", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-1", "tag", "Tag 1"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-2", "tag", "Tag 2"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-1", "note-1", "tag-1", "part_of"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-2", "note-1", "tag-2", "part_of"],
      );

      await act(async () => {
        await result.current.deleteNode("note-1");
      });

      const nodes = await db.query("SELECT id FROM nodes WHERE id = $1", ["note-1"]);
      const edges = await db.query("SELECT id FROM edges WHERE source_id = $1", ["note-1"]);

      expect(nodes.rows).toHaveLength(0);
      expect(edges.rows).toHaveLength(0);
    } finally {
      unmount();
    }
  });

  it("createTag creates a tag node with optional parent edge", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      let tagId = "";
      await act(async () => {
        const created = await result.current.createTag("Standalone Tag");
        tagId = created.id;
      });

      const standaloneNodes = await db.query("SELECT id, type, title FROM nodes WHERE id = $1", [
        tagId,
      ]);
      const standaloneEdges = await db.query("SELECT id FROM edges WHERE source_id = $1", [tagId]);

      expect(standaloneNodes.rows[0]).toEqual({ id: tagId, type: "tag", title: "Standalone Tag" });
      expect(standaloneEdges.rows).toHaveLength(0);

      let childTagId = "";
      await act(async () => {
        const created = await result.current.createTag("Child Tag", "root");
        childTagId = created.id;
      });

      const childNodes = await db.query("SELECT id, type, title FROM nodes WHERE id = $1", [
        childTagId,
      ]);
      const childEdges = await db.query(
        "SELECT source_id, target_id, type FROM edges WHERE source_id = $1",
        [childTagId],
      );

      expect(childNodes.rows[0]).toEqual({ id: childTagId, type: "tag", title: "Child Tag" });
      expect(childEdges.rows[0]).toEqual({
        source_id: childTagId,
        target_id: "root",
        type: "part_of",
      });
    } finally {
      unmount();
    }
  });

  it("updateNode updates provided fields", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, content, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Old", "Old content", "red"],
      );

      await act(async () => {
        await result.current.updateNode("note-1", {
          title: "New",
          content: "New content",
          color: "blue",
        });
      });

      const nodes = await db.query("SELECT title, content, color FROM nodes WHERE id = $1", [
        "note-1",
      ]);

      expect(nodes.rows[0]).toEqual({
        title: "New",
        content: "New content",
        color: "blue",
      });
    } finally {
      unmount();
    }
  });

  it("moveNode replaces part_of edge", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-a", "tag", "Tag A"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-b", "tag", "Tag B"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-1", "note-1", "tag-a", "part_of"],
      );

      await act(async () => {
        await result.current.moveNode("note-1", "tag-b");
      });

      const edges = await db.query<{ target_id: string }>(
        "SELECT target_id FROM edges WHERE source_id = $1 AND type = 'part_of'",
        ["note-1"],
      );

      expect(edges.rows).toHaveLength(1);
      expect(edges.rows[0]?.target_id).toBe("tag-b");
    } finally {
      unmount();
    }
  });

  it("moveNode removes multiple part_of edges before adding new", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-a", "tag", "Tag A"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-b", "tag", "Tag B"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["tag-c", "tag", "Tag C"],
      );
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        ["note-1", "note", "Note 1"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-a", "note-1", "tag-a", "part_of"],
      );
      await db.query(
        "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
        ["edge-b", "note-1", "tag-b", "part_of"],
      );

      await act(async () => {
        await result.current.moveNode("note-1", "tag-c");
      });

      const edges = await db.query<{ target_id: string }>(
        "SELECT target_id FROM edges WHERE source_id = $1 AND type = 'part_of'",
        ["note-1"],
      );

      expect(edges.rows).toHaveLength(1);
      expect(edges.rows[0]?.target_id).toBe("tag-c");
    } finally {
      unmount();
    }
  });

  it("updateNode applies a provided updatedAt", async () => {
    const db = await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(db),
    });

    try {
      await db.query(
        "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
        ["note-1", "note", "Note 1", "2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"],
      );

      const updatedAt = new Date("2020-01-05T12:00:00Z");
      await act(async () => {
        await result.current.updateNode("note-1", { updatedAt });
      });

      const nodes = await db.query<{ updated_at: string | Date }>(
        "SELECT updated_at FROM nodes WHERE id = $1",
        ["note-1"],
      );

      const rawUpdatedAt = nodes.rows[0]?.updated_at;
      const datePrefix =
        rawUpdatedAt instanceof Date
          ? rawUpdatedAt.toISOString().slice(0, 10)
          : String(rawUpdatedAt ?? "").slice(0, 10);

      expect(datePrefix).toBe(updatedAt.toISOString().slice(0, 10));
    } finally {
      unmount();
    }
  });
});
