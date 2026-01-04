// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { nodesCollection } from "@/lib/collections";
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

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SidebarProvider>{children}</SidebarProvider>;
  };
}

describe("AppSidebar", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("creates a new note and navigates to it", async () => {
    await createTestDb();
    const Wrapper = createWrapper();

    render(<AppSidebar />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: "New Note" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

    const call = mockNavigate.mock.calls[0]?.[0] as
      | { to?: string; params?: { noteId?: string } }
      | undefined;
    const noteId = call?.params?.noteId;

    expect(call?.to).toBe("/notes/$noteId");
    expect(noteId).toEqual(expect.any(String));

    const node = nodesCollection.state.get(noteId!);
    expect(node?.type).toBe("note");
  });

  it("creates a new tag under the root", async () => {
    await createTestDb();
    const Wrapper = createWrapper();

    render(<AppSidebar />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: "New Tag" }));

    await waitFor(() => {
      const nodes = Array.from(nodesCollection.state.values());
      const newTag = nodes.find((n) => n.type === "tag" && n.title === "New Tag");
      expect(newTag).toBeTruthy();
    });
  });
});
