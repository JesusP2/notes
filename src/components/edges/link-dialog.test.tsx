// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { createTestDb, reloadCollectionsFromDb } from "@/test/helpers";
import { LinkDialog } from "./link-dialog";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
}

describe("LinkDialog", () => {
  it("creates an edge between notes", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-source", "note", "Source Note"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-target", "note", "Target Note"],
    );
    await reloadCollectionsFromDb();

    render(<LinkDialog open onOpenChange={() => undefined} sourceId="note-source" />, {
      wrapper: Wrapper,
    });

    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "Target" },
    });

    await waitFor(() => expect(screen.getByText("Target Note")).not.toBeNull());
    fireEvent.click(screen.getByText("Target Note"));

    fireEvent.click(screen.getByRole("button", { name: "Create Link" }));

    await waitFor(async () => {
      const edges = await db.query<{ type: string }>(
        "SELECT type FROM edges WHERE source_id = $1 AND target_id = $2",
        ["note-source", "note-target"],
      );
      expect(edges.rows[0]?.type).toBe("references");
    });
  });
});
