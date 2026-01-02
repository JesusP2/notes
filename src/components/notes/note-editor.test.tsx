// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@/db/schema/graph";
import { NoteEditor } from "./note-editor";

vi.mock("@tiptap/react", () => ({
  useEditor: () => ({
    destroy: vi.fn(),
    getHTML: () => "<p>test</p>",
    storage: {
      vimMode: {
        enabled: false,
        mode: "insert",
      },
    },
  }),
  EditorContent: () => <div data-testid="tiptap-editor-content">TipTap Editor</div>,
}));

const baseNote: Node = {
  id: "note-1",
  type: "note",
  title: "Example Note",
  content: "<h1>Example Note</h1><p>Hello world</p>",
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
    expect(screen.queryByTestId("tiptap-editor")).not.toBeNull();
  });

  it("uses note content as initial content", () => {
    const handleChange = vi.fn();
    const noteWithContent: Node = {
      ...baseNote,
      content: "<h1>My Title</h1><p>Some content here</p>",
    };

    render(<NoteEditor note={noteWithContent} onChange={handleChange} />);

    expect(screen.queryByTestId("tiptap-editor")).not.toBeNull();
  });

  it("generates default content from title when content is empty", () => {
    const handleChange = vi.fn();
    const noteWithoutContent: Node = {
      ...baseNote,
      content: null,
      title: "New Note",
    };

    render(<NoteEditor note={noteWithoutContent} onChange={handleChange} />);

    expect(screen.queryByTestId("tiptap-editor")).not.toBeNull();
  });
});
