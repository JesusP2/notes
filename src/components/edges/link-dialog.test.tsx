// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { edgesCollection } from "@/lib/collections";
import { createTestDb, insertTestNode } from "@/test/helpers";
import { LinkDialog } from "./link-dialog";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
}

describe("LinkDialog", () => {
  it("creates an edge between notes", async () => {
    await createTestDb();
    const Wrapper = createWrapper();

    insertTestNode({ id: "note-source", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-target", type: "note", title: "Target Note" });

    render(<LinkDialog open onOpenChange={() => undefined} sourceId="note-source" />, {
      wrapper: Wrapper,
    });

    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "Target" },
    });

    await waitFor(() => expect(screen.getByText("Target Note")).not.toBeNull());
    fireEvent.click(screen.getByText("Target Note"));

    fireEvent.click(screen.getByRole("button", { name: "Create Link" }));

    await waitFor(() => {
      const edges = Array.from(edgesCollection.state.values());
      const edge = edges.find(
        (e) => e.sourceId === "note-source" && e.targetId === "note-target",
      );
      expect(edge?.type).toBe("references");
    });
  });
});
