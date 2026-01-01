// @vitest-environment jsdom
import React from "react";
import { PGliteProvider } from "@electric-sql/pglite-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/test/helpers";
import { FolderTree } from "./folder-tree";
import { TagsSection } from "./tags-section";

function createWrapper(db: Awaited<ReturnType<typeof createTestDb>>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <PGliteProvider db={db}>{children}</PGliteProvider>;
  };
}

describe("FolderTree", () => {
  it("renders root children", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["folder-1", "folder", "Folder 1"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Note 1"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-folder", "folder-1", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-note", "note-1", "root", "part_of"],
    );

    render(<FolderTree />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.queryByText("Root")).not.toBeNull());
    await waitFor(() => expect(screen.queryByText("Folder 1")).not.toBeNull());
    await waitFor(() => expect(screen.queryByText("Note 1")).not.toBeNull());
  });

  it("expands and collapses folders", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["folder-1", "folder", "Folder 1"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Nested Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-folder", "folder-1", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-note", "note-1", "folder-1", "part_of"],
    );

    render(<FolderTree />, { wrapper: Wrapper });

    const toggle = await screen.findByLabelText("Toggle folder Folder 1");
    expect(screen.queryByText("Nested Note")).toBeNull();

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Nested Note")).not.toBeNull());

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Nested Note")).toBeNull());
  });

  it("shows notes in multiple folders with an indicator", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["folder-a", "folder", "Folder A"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["folder-b", "folder", "Folder B"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-shared", "note", "Shared Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-root-a", "folder-a", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-root-b", "folder-b", "root", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-a", "note-shared", "folder-a", "part_of"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-b", "note-shared", "folder-b", "part_of"],
    );

    render(<FolderTree />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByLabelText("Toggle folder Folder A"));
    fireEvent.click(await screen.findByLabelText("Toggle folder Folder B"));

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

    render(<FolderTree onSelectNode={handleSelect} />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.queryByText("Note 1")).not.toBeNull());
    fireEvent.click(screen.getByText("Note 1"));

    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "note-1" }));
  });
});

describe("TagsSection", () => {
  it("expands tags to show tagged notes", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["tag-1", "tag", "Alpha"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Tagged Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-tag", "note-1", "tag-1", "tagged_with"],
    );

    render(<TagsSection />, { wrapper: Wrapper });

    const toggle = await screen.findByLabelText("Toggle tag Alpha");
    expect(screen.queryByText("Tagged Note")).toBeNull();

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByText("Tagged Note")).not.toBeNull());
  });

  it("calls onSelectNode when a tagged note is clicked", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);
    const handleSelect = vi.fn();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["tag-1", "tag", "Alpha"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Tagged Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-tag", "note-1", "tag-1", "tagged_with"],
    );

    render(<TagsSection onSelectNode={handleSelect} />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByLabelText("Toggle tag Alpha"));
    await waitFor(() => expect(screen.queryByText("Tagged Note")).not.toBeNull());

    fireEvent.click(screen.getByText("Tagged Note"));

    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "note-1" }));
  });
});
