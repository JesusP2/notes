// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { edgesCollection, nodesCollection } from "@/lib/collections";
import { createTestDb, insertTestEdge, insertTestNode } from "@/test/helpers";
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

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
}

describe("useTagChildren", () => {
  it("returns empty array for empty tag", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useTagChildren("root"), {
      wrapper: createWrapper(),
    });

    try {
      expect(result.current).toEqual([]);
    } finally {
      unmount();
    }
  });

  it("returns direct children only and sorts tags before notes", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useTagChildren("root"), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "tag-z", type: "tag", title: "Zoo" });
      insertTestNode({ id: "note-a", type: "note", title: "Alpha" });
      insertTestNode({ id: "note-nested", type: "note", title: "Nested" });
      insertTestEdge({ id: "edge-root-tag", sourceId: "tag-z", targetId: "root", type: "part_of" });
      insertTestEdge({
        id: "edge-root-note",
        sourceId: "note-a",
        targetId: "root",
        type: "tagged_with",
      });
      insertTestEdge({
        id: "edge-tag-note",
        sourceId: "note-nested",
        targetId: "tag-z",
        type: "tagged_with",
      });

      await waitFor(() => expect(result.current).toHaveLength(2));
      expect(result.current.map((node) => node.id)).toEqual(["tag-z", "note-a"]);
    } finally {
      unmount();
    }
  });

  it("updates when a child is added and removed", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useTagChildren("root"), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "First" });
      insertTestEdge({
        id: "edge-1",
        sourceId: "note-1",
        targetId: "root",
        type: "tagged_with",
      });

      await waitFor(() => expect(result.current).toHaveLength(1));

      nodesCollection.delete("note-1");
      await waitFor(() => expect(result.current).toHaveLength(0));
    } finally {
      unmount();
    }
  });
});

describe("useNodeById", () => {
  it("returns null until the node exists", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeById("note-1"), {
      wrapper: createWrapper(),
    });

    try {
      expect(result.current).toBeNull();

      insertTestNode({ id: "note-1", type: "note", title: "First Note" });

      await waitFor(() => expect(result.current?.id).toBe("note-1"));
    } finally {
      unmount();
    }
  });

  it("returns null after the node is deleted", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeById("note-1"), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Temp Note" });

      await waitFor(() => expect(result.current?.id).toBe("note-1"));

      nodesCollection.delete("note-1");

      await waitFor(() => expect(result.current).toBeNull());
    } finally {
      unmount();
    }
  });
});

describe("useNodeEdges", () => {
  it("returns incoming and outgoing edges", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeEdges("note-1"), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
      insertTestNode({ id: "note-2", type: "note", title: "Note 2" });
      insertTestNode({ id: "note-3", type: "note", title: "Note 3" });
      insertTestEdge({
        id: "edge-out",
        sourceId: "note-1",
        targetId: "note-2",
        type: "references",
      });
      insertTestEdge({
        id: "edge-in",
        sourceId: "note-3",
        targetId: "note-1",
        type: "supports",
      });

      await waitFor(() => expect(result.current.outgoing).toHaveLength(1));
      await waitFor(() => expect(result.current.incoming).toHaveLength(1));

      expect(result.current.outgoing[0]?.id).toBe("edge-out");
      expect(result.current.incoming[0]?.id).toBe("edge-in");
    } finally {
      unmount();
    }
  });

  it("returns empty arrays for a node with no edges", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeEdges("note-1"), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Solo Note" });

      await waitFor(() => expect(result.current.outgoing).toHaveLength(0));
      await waitFor(() => expect(result.current.incoming).toHaveLength(0));
    } finally {
      unmount();
    }
  });
});

describe("useTags", () => {
  it("returns tags sorted by title", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useTags(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "tag-b", type: "tag", title: "beta" });
      insertTestNode({ id: "tag-a", type: "tag", title: "Alpha" });
      insertTestNode({ id: "note-1", type: "note", title: "Note 1" });

      await waitFor(() => expect(result.current).toHaveLength(3));
      expect(result.current.map((tag) => tag.title)).toEqual(["#root", "Alpha", "beta"]);
    } finally {
      unmount();
    }
  });
});

describe("useSearchNodes", () => {
  it("returns matching nodes by title and content", async () => {
    await createTestDb();
    const { result, rerender, unmount } = renderHook(
      ({ query }: { query: string }) => useSearchNodes(query),
      {
        initialProps: { query: "" },
        wrapper: createWrapper(),
      },
    );

    try {
      expect(result.current).toEqual([]);

      insertTestNode({
        id: "note-1",
        type: "note",
        title: "Alpha Note",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Zebra content" }] }] },
      });
      insertTestNode({
        id: "note-2",
        type: "note",
        title: "Beta Note",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Alpha mention" }] }] },
      });

      rerender({ query: "alpha" });

      await waitFor(() => expect(result.current).toHaveLength(2));
      expect(result.current.map((node) => node.id).sort()).toEqual(["note-1", "note-2"]);
    } finally {
      unmount();
    }
  });

  it("returns empty results for an empty query", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useSearchNodes("   "), {
      wrapper: createWrapper(),
    });

    try {
      expect(result.current).toEqual([]);
    } finally {
      unmount();
    }
  });

  it("orders results by updated_at descending", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useSearchNodes("note"), {
      wrapper: createWrapper(),
    });

    try {
      const noteContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "note" }] }] };
      insertTestNode({
        id: "note-old",
        type: "note",
        title: "Note Old",
        content: noteContent,
        createdAt: new Date("2020-01-01T00:00:00Z"),
        updatedAt: new Date("2020-01-01T00:00:00Z"),
      });
      insertTestNode({
        id: "note-new",
        type: "note",
        title: "Note New",
        content: noteContent,
        createdAt: new Date("2020-01-02T00:00:00Z"),
        updatedAt: new Date("2020-01-02T00:00:00Z"),
      });

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
    await createTestDb();
    const { result, unmount } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Graph Note" });
      insertTestEdge({
        id: "edge-graph",
        sourceId: "note-1",
        targetId: "root",
        type: "tagged_with",
      });

      await waitFor(() => expect(result.current.nodes.map((node) => node.id)).toContain("note-1"));
      await waitFor(() =>
        expect(result.current.edges.map((edge) => edge.id)).toContain("edge-graph"),
      );
    } finally {
      unmount();
    }
  });

  it("includes the seeded root node", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useGraphData(), {
      wrapper: createWrapper(),
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
    await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
      insertTestNode({ id: "note-2", type: "note", title: "Note 2" });

      let edgeId = "";
      await act(async () => {
        const created = result.current.createEdge("note-1", "note-2", "references");
        edgeId = created.id;
      });

      const edge = edgesCollection.state.get(edgeId);
      expect(edge).toBeTruthy();
      expect(edge?.sourceId).toBe("note-1");
      expect(edge?.targetId).toBe("note-2");
      expect(edge?.type).toBe("references");
    } finally {
      unmount();
    }
  });

  it("changeEdgeType updates the edge type", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
      insertTestNode({ id: "note-2", type: "note", title: "Note 2" });
      insertTestEdge({
        id: "edge-1",
        sourceId: "note-1",
        targetId: "note-2",
        type: "references",
      });

      act(() => {
        result.current.changeEdgeType("edge-1", "supports");
      });

      const edge = edgesCollection.state.get("edge-1");
      expect(edge?.type).toBe("supports");
    } finally {
      unmount();
    }
  });

  it("deleteEdge removes the edge row", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
      insertTestNode({ id: "note-2", type: "note", title: "Note 2" });
      insertTestEdge({
        id: "edge-1",
        sourceId: "note-1",
        targetId: "note-2",
        type: "references",
      });

      await act(async () => {
        await result.current.deleteEdge("edge-1");
      });

      expect(edgesCollection.state.get("edge-1")).toBeUndefined();
    } finally {
      unmount();
    }
  });

  it("createEdge rejects duplicate edges", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useEdgeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
      insertTestNode({ id: "note-2", type: "note", title: "Note 2" });

      act(() => {
        result.current.createEdge("note-1", "note-2", "references");
      });

      expect(() => result.current.createEdge("note-1", "note-2", "references")).toThrow();
    } finally {
      unmount();
    }
  });
});

describe("useNodeMutations", () => {
  it("createNote creates a node and tagged_with edge", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      let createdId = "";
      act(() => {
        const created = result.current.createNote("New Note", "root");
        createdId = created.id;
      });

      const node = nodesCollection.state.get(createdId);
      expect(node).toBeTruthy();
      expect(node?.type).toBe("note");
      expect(node?.title).toBe("New Note");

      const edges = Array.from(edgesCollection.state.values()).filter(
        (e) => e.sourceId === createdId,
      );
      expect(edges).toHaveLength(1);
      expect(edges[0]?.targetId).toBe("root");
      expect(edges[0]?.type).toBe("tagged_with");
    } finally {
      unmount();
    }
  });

  it("deleteNode removes a note and all its edges", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "tag-1", type: "tag", title: "Tag 1" });
      insertTestNode({ id: "tag-2", type: "tag", title: "Tag 2" });
      insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
      insertTestEdge({
        id: "edge-1",
        sourceId: "note-1",
        targetId: "tag-1",
        type: "tagged_with",
      });
      insertTestEdge({
        id: "edge-2",
        sourceId: "note-1",
        targetId: "tag-2",
        type: "tagged_with",
      });

      await act(async () => {
        await result.current.deleteNode("note-1");
      });

      expect(nodesCollection.state.get("note-1")).toBeUndefined();
      expect(edgesCollection.state.get("edge-1")).toBeUndefined();
      expect(edgesCollection.state.get("edge-2")).toBeUndefined();
    } finally {
      unmount();
    }
  });

  it("createTag creates a tag node with a parent edge", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      let childTagId = "";
      act(() => {
        const created = result.current.createTag("Child Tag", "root");
        childTagId = created.id;
      });

      const node = nodesCollection.state.get(childTagId);
      expect(node).toBeTruthy();
      expect(node?.type).toBe("tag");
      expect(node?.title).toBe("Child Tag");

      const edges = Array.from(edgesCollection.state.values()).filter(
        (e) => e.sourceId === childTagId,
      );
      expect(edges).toHaveLength(1);
      expect(edges[0]?.targetId).toBe("root");
      expect(edges[0]?.type).toBe("part_of");
    } finally {
      unmount();
    }
  });

  it("updateNode updates provided fields", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      const oldContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Old content" }] }] };
      const newContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "New content" }] }] };

      insertTestNode({
        id: "note-1",
        type: "note",
        title: "Old",
        content: oldContent,
        color: "red",
      });

      act(() => {
        result.current.updateNode("note-1", {
          title: "New",
          content: newContent,
          color: "blue",
        });
      });

      const node = nodesCollection.state.get("note-1");
      expect(node?.title).toBe("New");
      expect(node?.content).toEqual(newContent);
      expect(node?.color).toBe("blue");
    } finally {
      unmount();
    }
  });

  it("moveTag replaces part_of edge", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "tag-a", type: "tag", title: "Tag A" });
      insertTestNode({ id: "tag-b", type: "tag", title: "Tag B" });
      insertTestNode({ id: "tag-move", type: "tag", title: "Tag Move" });
      insertTestEdge({
        id: "edge-1",
        sourceId: "tag-move",
        targetId: "tag-a",
        type: "part_of",
      });

      act(() => {
        result.current.moveTag("tag-move", "tag-b");
      });

      const edges = Array.from(edgesCollection.state.values()).filter(
        (e) => e.sourceId === "tag-move" && e.type === "part_of",
      );
      expect(edges).toHaveLength(1);
      expect(edges[0]?.targetId).toBe("tag-b");
    } finally {
      unmount();
    }
  });

  it("moveTag replaces the part_of edge without affecting other edges", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({ id: "tag-a", type: "tag", title: "Tag A" });
      insertTestNode({ id: "tag-b", type: "tag", title: "Tag B" });
      insertTestNode({ id: "tag-c", type: "tag", title: "Tag C" });
      insertTestNode({ id: "tag-move", type: "tag", title: "Tag Move" });
      insertTestEdge({
        id: "edge-a",
        sourceId: "tag-move",
        targetId: "tag-a",
        type: "part_of",
      });
      insertTestEdge({
        id: "edge-b",
        sourceId: "tag-move",
        targetId: "tag-b",
        type: "related_to",
      });

      act(() => {
        result.current.moveTag("tag-move", "tag-c");
      });

      const partOfEdges = Array.from(edgesCollection.state.values()).filter(
        (e) => e.sourceId === "tag-move" && e.type === "part_of",
      );
      expect(partOfEdges).toHaveLength(1);
      expect(partOfEdges[0]?.targetId).toBe("tag-c");

      const relatedEdges = Array.from(edgesCollection.state.values()).filter(
        (e) => e.sourceId === "tag-move" && e.type === "related_to",
      );
      expect(relatedEdges).toHaveLength(1);
      expect(relatedEdges[0]?.targetId).toBe("tag-b");
    } finally {
      unmount();
    }
  });

  it("updateNode applies a provided updatedAt", async () => {
    await createTestDb();
    const { result, unmount } = renderHook(() => useNodeMutations(), {
      wrapper: createWrapper(),
    });

    try {
      insertTestNode({
        id: "note-1",
        type: "note",
        title: "Note 1",
        createdAt: new Date("2020-01-01T00:00:00Z"),
        updatedAt: new Date("2020-01-01T00:00:00Z"),
      });

      const updatedAt = new Date("2020-01-05T12:00:00Z");
      act(() => {
        result.current.updateNode("note-1", { updatedAt });
      });

      const node = nodesCollection.state.get("note-1");
      expect(node?.updatedAt.toISOString().slice(0, 10)).toBe(updatedAt.toISOString().slice(0, 10));
    } finally {
      unmount();
    }
  });
});
