// @vitest-environment jsdom

import { PGliteProvider } from "@electric-sql/pglite-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/test/helpers";
import { TagTree } from "./tag-tree";

function createWrapper(db: Awaited<ReturnType<typeof createTestDb>>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <PGliteProvider db={db}>{children}</PGliteProvider>;
  };
}

describe("TagTree", () => {
  it("renders root children without showing root itself", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["tag-1", "tag", "Tag 1"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Note 1"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-tag", "tag-1", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-note", "note-1", "root", "part_of"],
    );

    render(<TagTree />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.queryByText("Tag 1")).not.toBeNull());
    await waitFor(() => expect(screen.queryByText("Note 1")).not.toBeNull());
    expect(screen.queryByText("#root")).toBeNull();
  });

  it("expands and collapses tags", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["tag-1", "tag", "Tag 1"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Nested Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-tag", "tag-1", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-note", "note-1", "tag-1", "part_of"],
    );

    render(<TagTree />, { wrapper: Wrapper });

    const toggle = await screen.findByLabelText("Toggle tag Tag 1");
    expect(screen.queryByText("Nested Note")).toBeNull();

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Nested Note")).not.toBeNull());

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Nested Note")).toBeNull());
  });

  it("shows notes in multiple tags with an indicator", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

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
      ["note-shared", "note", "Shared Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-root-a", "tag-a", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-root-b", "tag-b", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-a", "note-shared", "tag-a", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-b", "note-shared", "tag-b", "part_of"],
    );

    render(<TagTree />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByLabelText("Toggle tag Tag A"));
    fireEvent.click(await screen.findByLabelText("Toggle tag Tag B"));

    await waitFor(() => expect(screen.getAllByText("Shared Note")).toHaveLength(2));
    await waitFor(() => expect(screen.getAllByLabelText("Multiple parents")).toHaveLength(2));
  });

  it("calls onSelectNode when a note is clicked", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);
    const handleSelect = vi.fn();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Note 1"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-note", "note-1", "root", "part_of"],
    );

    render(<TagTree onSelectNode={handleSelect} />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.queryByText("Note 1")).not.toBeNull());
    fireEvent.click(screen.getByText("Note 1"));

    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "note-1" }));
  });

  it("supports nested tags", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["parent-tag", "tag", "Parent Tag"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["child-tag", "tag", "Child Tag"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Nested Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-parent", "parent-tag", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-child", "child-tag", "parent-tag", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-note", "note-1", "child-tag", "part_of"],
    );

    render(<TagTree />, { wrapper: Wrapper });

    // Expand parent tag
    fireEvent.click(await screen.findByLabelText("Toggle tag Parent Tag"));
    await waitFor(() => expect(screen.queryByText("Child Tag")).not.toBeNull());

    // Expand child tag
    fireEvent.click(await screen.findByLabelText("Toggle tag Child Tag"));
    await waitFor(() => expect(screen.queryByText("Nested Note")).not.toBeNull());
  });
});
