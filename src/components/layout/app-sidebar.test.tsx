// @vitest-environment jsdom

import { PGliteProvider } from "@electric-sql/pglite-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/test/helpers";
import { AppSidebar } from "./app-sidebar";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

function createWrapper(db: Awaited<ReturnType<typeof createTestDb>>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <PGliteProvider db={db}>{children}</PGliteProvider>;
  };
}

describe("AppSidebar", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("creates a new note and navigates to it", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    render(<AppSidebar />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: "New Note" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

    const call = mockNavigate.mock.calls[0]?.[0] as
      | { to?: string; params?: { noteId?: string } }
      | undefined;
    const noteId = call?.params?.noteId;

    expect(call?.to).toBe("/notes/$noteId");
    expect(noteId).toEqual(expect.any(String));

    const result = await db.query<{ type: string }>("SELECT id, type FROM nodes WHERE id = $1", [
      noteId,
    ]);
    expect(result.rows[0]?.type).toBe("note");
  });

  it("creates a new tag under the root", async () => {
    const db = await createTestDb();
    const Wrapper = createWrapper(db);

    render(<AppSidebar />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: "New Tag" }));

    await waitFor(async () => {
      const result = await db.query(
        "SELECT id FROM nodes WHERE type = 'tag' AND title = 'New Tag'",
      );
      expect(result.rows).toHaveLength(1);
    });
  });
});
