// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@/db/schema/graph";
import { NoteEditor } from "./note-editor";

vi.mock("@milkdown/react", () => ({
  Milkdown: () => <div data-testid="milkdown-editor">Milkdown Editor</div>,
  MilkdownProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useEditor: () => {},
}));

vi.mock("@/components/notes/note-tags", () => ({
  NoteTags: () => <div data-testid="note-tags">Note Tags</div>,
}));

const baseNote: Node = {
  id: "note-1",
  type: "note",
  title: "Example Note",
  content: "# Example Note\n\nHello world",
  color: null,
  createdAt: new Date("2020-01-01T00:00:00Z"),
  updatedAt: new Date("2020-01-01T00:00:00Z"),
};

describe("NoteEditor", () => {
  it("shows empty state when note is null", () => {
    const handleChange = vi.fn();

    render(<NoteEditor note={null} onChange={handleChange} />);

    expect(screen.queryByText("No Note Selected")).not.toBeNull();
    expect(screen.queryByText(/Select a note from the sidebar/)).not.toBeNull();
  });

  it("renders editor when note is provided", () => {
    const handleChange = vi.fn();

    render(<NoteEditor note={baseNote} onChange={handleChange} />);

    expect(screen.queryByText("No Note Selected")).toBeNull();
    expect(screen.queryByTestId("milkdown-editor")).not.toBeNull();
  });

  it("uses note content as initial content", () => {
    const handleChange = vi.fn();
    const noteWithContent: Node = {
      ...baseNote,
      content: "# My Title\n\nSome content here",
    };

    render(<NoteEditor note={noteWithContent} onChange={handleChange} />);

    expect(screen.queryByTestId("milkdown-editor")).not.toBeNull();
  });

  it("generates default content from title when content is empty", () => {
    const handleChange = vi.fn();
    const noteWithoutContent: Node = {
      ...baseNote,
      content: null,
      title: "New Note",
    };

    render(<NoteEditor note={noteWithoutContent} onChange={handleChange} />);

    expect(screen.queryByTestId("milkdown-editor")).not.toBeNull();
  });
});
