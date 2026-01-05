// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlashCommandMenu } from "./slash-command-menu";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashCommand } from "@/lib/slash-commands";
import { TypeIcon, Heading1Icon, InfoIcon } from "lucide-react";
import type { RefObject } from "react";

const mockCommands: SlashCommand[] = [
  {
    id: "paragraph",
    label: "Text",
    description: "Plain text paragraph",
    icon: TypeIcon,
    category: "basic",
    keywords: ["text"],
    action: vi.fn(),
  },
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    icon: Heading1Icon,
    category: "basic",
    keywords: ["h1"],
    action: vi.fn(),
  },
  {
    id: "callout-info",
    label: "Info Callout",
    description: "Informational note block",
    icon: InfoIcon,
    category: "formatting",
    keywords: ["info"],
    action: vi.fn(),
  },
];

function createMockProps(
  items: SlashCommand[] = mockCommands
): SuggestionProps<SlashCommand> {
  return {
    items,
    command: vi.fn(),
    editor: {} as never,
    range: { from: 0, to: 1 },
    query: "",
    text: "/",
    clientRect: null,
  } as unknown as SuggestionProps<SlashCommand>;
}

describe("SlashCommandMenu", () => {
  it("renders command items", () => {
    render(<SlashCommandMenu {...createMockProps()} />);
    expect(screen.getByText("Text")).not.toBeNull();
    expect(screen.getByText("Heading 1")).not.toBeNull();
    expect(screen.getByText("Info Callout")).not.toBeNull();
  });

  it("shows empty state when no items", () => {
    render(<SlashCommandMenu {...createMockProps([])} />);
    expect(screen.getByText("No commands found")).not.toBeNull();
  });

  it("displays descriptions", () => {
    render(<SlashCommandMenu {...createMockProps()} />);
    expect(screen.getByText("Plain text paragraph")).not.toBeNull();
    expect(screen.getByText("Large section heading")).not.toBeNull();
  });

  it("selects item on click", () => {
    const mockCommand = vi.fn();
    const props = { ...createMockProps(), command: mockCommand };
    render(<SlashCommandMenu {...props} />);

    fireEvent.click(screen.getByText("Text"));
    expect(mockCommand).toHaveBeenCalledWith(mockCommands[0]);
  });

  it("highlights first item by default", () => {
    render(<SlashCommandMenu {...createMockProps()} />);
    const firstItem = screen.getByText("Text").closest("button");
    expect(firstItem?.className).toContain("slash-command-item-selected");
  });

  it("groups commands by category", () => {
    render(<SlashCommandMenu {...createMockProps()} />);
    expect(screen.getByText("Basic Blocks")).not.toBeNull();
    expect(screen.getByText("Formatting")).not.toBeNull();
  });

  it("navigates with arrow down via onKeyDown", () => {
    const ref: RefObject<{ onKeyDown: (p: { event: KeyboardEvent }) => boolean } | null> = {
      current: null,
    };
    render(<SlashCommandMenu {...createMockProps()} ref={ref as never} />);

    const downResult = ref.current?.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "ArrowDown" }),
    });
    expect(downResult).toBe(true);
  });

  it("navigates with arrow up via onKeyDown", () => {
    const ref: RefObject<{ onKeyDown: (p: { event: KeyboardEvent }) => boolean } | null> = {
      current: null,
    };
    render(<SlashCommandMenu {...createMockProps()} ref={ref as never} />);

    const upResult = ref.current?.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "ArrowUp" }),
    });
    expect(upResult).toBe(true);
  });

  it("selects on Enter via onKeyDown", () => {
    const mockCommand = vi.fn();
    const props = { ...createMockProps(), command: mockCommand };
    const ref: RefObject<{ onKeyDown: (p: { event: KeyboardEvent }) => boolean } | null> = {
      current: null,
    };
    render(<SlashCommandMenu {...props} ref={ref as never} />);

    const result = ref.current?.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "Enter" }),
    });
    expect(result).toBe(true);
    expect(mockCommand).toHaveBeenCalled();
  });

  it("returns false for unhandled keys", () => {
    const ref: RefObject<{ onKeyDown: (p: { event: KeyboardEvent }) => boolean } | null> = {
      current: null,
    };
    render(<SlashCommandMenu {...createMockProps()} ref={ref as never} />);

    const result = ref.current?.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "a" }),
    });
    expect(result).toBe(false);
  });

  it("resets selection when items change", () => {
    const { rerender } = render(<SlashCommandMenu {...createMockProps()} />);

    const newItems = [mockCommands[1]];
    rerender(<SlashCommandMenu {...createMockProps(newItems)} />);

    const firstItem = screen.getByText("Heading 1").closest("button");
    expect(firstItem?.className).toContain("slash-command-item-selected");
  });
});
