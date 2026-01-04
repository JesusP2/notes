// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestDb, insertTestNode } from "@/test/helpers";
import { NodeSearch } from "./node-search";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
}

describe("NodeSearch", () => {
  it("filters and selects a note", async () => {
    await createTestDb();
    const Wrapper = createWrapper();
    const handleSelect = vi.fn();

    insertTestNode({ id: "note-1", type: "note", title: "Alpha Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Beta Note" });

    render(<NodeSearch onSelect={handleSelect} />, { wrapper: Wrapper });

    const input = screen.getByLabelText("Search notes");
    fireEvent.change(input, { target: { value: "Beta" } });

    await waitFor(() => expect(screen.getByText("Beta Note")).not.toBeNull());

    fireEvent.click(screen.getByText("Beta Note"));

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "note-2", title: "Beta Note" }),
    );
  });
});
