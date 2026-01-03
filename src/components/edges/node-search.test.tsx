// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/test/helpers";
import { NodeSearch } from "./node-search";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
}

describe("NodeSearch", () => {
  it("filters and selects a note", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper();
    const handleSelect = vi.fn();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Alpha Note"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-2", "note", "Beta Note"],
    );

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
