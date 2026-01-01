// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@/db/schema/graph";
import { NoteEditor } from "./note-editor";

const baseNote: Node = {
  id: "note-1",
  type: "note",
  title: "Example Note",
  content: "Hello world",
  color: null,
  createdAt: new Date("2020-01-01T00:00:00Z"),
  updatedAt: new Date("2020-01-01T00:00:00Z"),
};

describe("NoteEditor", () => {
  it("loads note title and content", () => {
    const handleChange = vi.fn();
    const handleTitleChange = vi.fn();

    render(
      <NoteEditor note={baseNote} onChange={handleChange} onTitleChange={handleTitleChange} />,
    );

    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    const contentInput = screen.getByLabelText("Content") as HTMLTextAreaElement;

    expect(titleInput.value).toBe("Example Note");
    expect(contentInput.value).toBe("Hello world");
  });

  it("auto-saves content after debounce", () => {
    vi.useFakeTimers();
    const handleChange = vi.fn();

    render(<NoteEditor note={baseNote} onChange={handleChange} debounceMs={300} />);

    const contentInput = screen.getByLabelText("Content") as HTMLTextAreaElement;
    fireEvent.change(contentInput, { target: { value: "Updated content" } });

    expect(handleChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(handleChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(handleChange).toHaveBeenCalledWith("Updated content");

    vi.useRealTimers();
  });

  it("detects wiki-links in content", () => {
    vi.useFakeTimers();
    const handleChange = vi.fn();
    const handleLinksChange = vi.fn();

    render(
      <NoteEditor
        note={baseNote}
        onChange={handleChange}
        onLinksChange={handleLinksChange}
        debounceMs={200}
      />,
    );

    const contentInput = screen.getByLabelText("Content") as HTMLTextAreaElement;
    fireEvent.change(contentInput, {
      target: { value: "See [[Alpha]] and [[Beta]]" },
    });

    vi.advanceTimersByTime(200);
    expect(handleLinksChange).toHaveBeenCalledWith(["Alpha", "Beta"]);

    vi.useRealTimers();
  });

  it("calls onTitleChange immediately", () => {
    const handleChange = vi.fn();
    const handleTitleChange = vi.fn();

    render(
      <NoteEditor note={baseNote} onChange={handleChange} onTitleChange={handleTitleChange} />,
    );

    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "New title" } });

    expect(handleTitleChange).toHaveBeenCalledWith("New title");
  });
});
