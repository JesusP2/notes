// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestDb, insertTestEdge, insertTestNode } from "@/test/helpers";
import { TagTree } from "./tag-tree";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
}

describe("TagTree", () => {
  it("renders root children without showing root itself", async () => {
    await createTestDb();
    const Wrapper = createWrapper();

    insertTestNode({ id: "tag-1", type: "tag", title: "Tag 1" });
    insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
    insertTestEdge({ id: "edge-tag", sourceId: "tag-1", targetId: "root", type: "part_of" });
    insertTestEdge({ id: "edge-note", sourceId: "note-1", targetId: "root", type: "tagged_with" });

    render(<TagTree />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.queryByText("Tag 1")).not.toBeNull());
    await waitFor(() => expect(screen.queryByText("Note 1")).not.toBeNull());
    expect(screen.queryByText("#root")).toBeNull();
  });

  it("expands and collapses tags", async () => {
    await createTestDb();
    const Wrapper = createWrapper();

    insertTestNode({ id: "tag-1", type: "tag", title: "Tag 1" });
    insertTestNode({ id: "note-1", type: "note", title: "Nested Note" });
    insertTestEdge({ id: "edge-tag", sourceId: "tag-1", targetId: "root", type: "part_of" });
    insertTestEdge({ id: "edge-note", sourceId: "note-1", targetId: "tag-1", type: "tagged_with" });

    render(<TagTree />, { wrapper: Wrapper });

    const toggle = await screen.findByLabelText("Toggle tag Tag 1");
    expect(screen.queryByText("Nested Note")).toBeNull();

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Nested Note")).not.toBeNull());

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Nested Note")).toBeNull());
  });

  it("shows notes in multiple tags with an indicator", async () => {
    await createTestDb();
    const Wrapper = createWrapper();

    insertTestNode({ id: "tag-a", type: "tag", title: "Tag A" });
    insertTestNode({ id: "tag-b", type: "tag", title: "Tag B" });
    insertTestNode({ id: "note-shared", type: "note", title: "Shared Note" });
    insertTestEdge({ id: "edge-root-a", sourceId: "tag-a", targetId: "root", type: "part_of" });
    insertTestEdge({ id: "edge-root-b", sourceId: "tag-b", targetId: "root", type: "part_of" });
    insertTestEdge({
      id: "edge-a",
      sourceId: "note-shared",
      targetId: "tag-a",
      type: "tagged_with",
    });
    insertTestEdge({
      id: "edge-b",
      sourceId: "note-shared",
      targetId: "tag-b",
      type: "tagged_with",
    });

    render(<TagTree />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByLabelText("Toggle tag Tag A"));
    fireEvent.click(await screen.findByLabelText("Toggle tag Tag B"));

    await waitFor(() => expect(screen.getAllByText("Shared Note")).toHaveLength(2));
    await waitFor(() => expect(screen.getAllByLabelText("Multiple parents")).toHaveLength(2));
  });

  it("calls onSelectNode when a note is clicked", async () => {
    await createTestDb();
    const Wrapper = createWrapper();
    const handleSelect = vi.fn();

    insertTestNode({ id: "note-1", type: "note", title: "Note 1" });
    insertTestEdge({ id: "edge-note", sourceId: "note-1", targetId: "root", type: "tagged_with" });

    render(<TagTree onSelectNode={handleSelect} />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.queryByText("Note 1")).not.toBeNull());
    fireEvent.click(screen.getByText("Note 1"));

    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "note-1" }));
  });

  it("supports nested tags", async () => {
    await createTestDb();
    const Wrapper = createWrapper();

    insertTestNode({ id: "parent-tag", type: "tag", title: "Parent Tag" });
    insertTestNode({ id: "child-tag", type: "tag", title: "Child Tag" });
    insertTestNode({ id: "note-1", type: "note", title: "Nested Note" });
    insertTestEdge({
      id: "edge-parent",
      sourceId: "parent-tag",
      targetId: "root",
      type: "part_of",
    });
    insertTestEdge({
      id: "edge-child",
      sourceId: "child-tag",
      targetId: "parent-tag",
      type: "part_of",
    });
    insertTestEdge({
      id: "edge-note",
      sourceId: "note-1",
      targetId: "child-tag",
      type: "tagged_with",
    });

    render(<TagTree />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByLabelText("Toggle tag Parent Tag"));
    await waitFor(() => expect(screen.queryByText("Child Tag")).not.toBeNull());

    fireEvent.click(await screen.findByLabelText("Toggle tag Child Tag"));
    await waitFor(() => expect(screen.queryByText("Nested Note")).not.toBeNull());
  });
});
