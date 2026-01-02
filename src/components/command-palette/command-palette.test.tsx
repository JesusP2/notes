// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SHORTCUTS, type ShortcutDefinition } from "@/lib/shortcuts";
import { CommandPalette } from "./command-palette";

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Element.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.setPointerCapture = vi.fn();
});

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/graph-hooks", () => ({
  useSearchNodes: () => [],
}));

const defaultProps = {
  onCreateNote: vi.fn(),
  onCreateTag: vi.fn(),
  onToggleSidebar: vi.fn(),
  onToggleTheme: vi.fn(),
  onShowShortcuts: vi.fn(),
  isDarkMode: false,
};

function keyToCode(key: string): string | undefined {
  if (key === "/") return "Slash";
  if (key.length === 1) {
    const upper = key.toUpperCase();
    if (/[A-Z]/.test(upper)) return `Key${upper}`;
    if (/[0-9]/.test(upper)) return `Digit${upper}`;
  }
  return key;
}

function fireShortcut(shortcut: ShortcutDefinition) {
  fireEvent.keyDown(document, {
    key: shortcut.key,
    code: keyToCode(shortcut.key),
    metaKey: Boolean(shortcut.modifiers?.meta),
    ctrlKey: false,
    altKey: Boolean(shortcut.modifiers?.alt),
    shiftKey: Boolean(shortcut.modifiers?.shift),
  });
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens on shortcut", async () => {
    render(<CommandPalette {...defaultProps} />);

    fireShortcut(SHORTCUTS.COMMAND_PALETTE);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Search notes, commands...")).not.toBeNull();
    });
  });

  it("shows command groups when open", async () => {
    render(<CommandPalette {...defaultProps} />);

    fireShortcut(SHORTCUTS.COMMAND_PALETTE);

    await waitFor(() => {
      expect(screen.queryByText("Navigation")).not.toBeNull();
    });

    expect(screen.queryByText("Notes")).not.toBeNull();
    expect(screen.queryByText("View")).not.toBeNull();
    expect(screen.queryByText("Help")).not.toBeNull();
  });

  it("shows New Note command", async () => {
    render(<CommandPalette {...defaultProps} />);

    fireShortcut(SHORTCUTS.COMMAND_PALETTE);

    await waitFor(() => {
      expect(screen.queryByText("New Note")).not.toBeNull();
    });
  });

  it("calls onCreateNote when New Note is selected", async () => {
    const onCreateNote = vi.fn();
    render(<CommandPalette {...defaultProps} onCreateNote={onCreateNote} />);

    fireShortcut(SHORTCUTS.COMMAND_PALETTE);

    await waitFor(() => {
      expect(screen.queryByText("New Note")).not.toBeNull();
    });

    fireEvent.click(screen.getByText("New Note"));

    expect(onCreateNote).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleTheme when Toggle Theme is selected", async () => {
    const onToggleTheme = vi.fn();
    render(<CommandPalette {...defaultProps} onToggleTheme={onToggleTheme} />);

    fireShortcut(SHORTCUTS.COMMAND_PALETTE);

    await waitFor(() => {
      expect(screen.queryByText("Toggle Theme")).not.toBeNull();
    });

    fireEvent.click(screen.getByText("Toggle Theme"));

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("navigates to graph view when Graph View is selected", async () => {
    render(<CommandPalette {...defaultProps} />);

    fireShortcut(SHORTCUTS.COMMAND_PALETTE);

    await waitFor(() => {
      expect(screen.queryByText("Graph View")).not.toBeNull();
    });

    fireEvent.click(screen.getByText("Graph View"));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/graph" });
  });
});
