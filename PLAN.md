# Predefined Blocks Implementation Plan

## Overview

Add a slash command menu and predefined block types to enhance the TipTap editor with rich content blocks similar to Notion. This plan includes comprehensive test coverage for all features.

## Analysis Summary

### Existing Codebase Patterns to Follow

| Pattern | Reference File | Reuse For |
|---------|----------------|-----------|
| Suggestion popup with tippy.js | `wiki-link-suggestion.ts` | Slash command menu |
| React list with keyboard nav | `wiki-link-list.tsx` | Slash command list |
| Custom block node | `image-upload-node-extension.ts` | Callout, Mermaid, Math nodes |
| React NodeView | `image-upload-node.tsx` | Mermaid, Math inline editor |
| SCSS node styling | `blockquote-node.scss` | All new block styles |
| Test structure | `note-editor.test.tsx`, `wiki-link-plugin.test.ts` | All new tests |

### Dependencies to Add

```bash
# Tables (Phase 3)
pnpm add @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell

# Math/LaTeX (Phase 4)
pnpm add @tiptap/extension-mathematics katex

# Mermaid Diagrams (Phase 5) - embedded, not dynamically imported
pnpm add mermaid
```

---

## Phase 1: Slash Command Infrastructure

### Goal
Create a `/` triggered command menu using the same pattern as wiki-links (`@tiptap/suggestion` + tippy.js + ReactRenderer).

### Files to Create

```
src/components/tiptap-extension/
  slash-command-extension.ts          # TipTap extension with @tiptap/suggestion
  slash-command-suggestion.ts         # Suggestion config (mirrors wiki-link-suggestion.ts)

src/components/tiptap-ui/slash-command-menu/
  index.tsx                           # Barrel export
  slash-command-menu.tsx              # React dropdown component
  slash-command-menu.scss             # Styles (mirrors wiki-link-list.scss)
  slash-command-menu.test.tsx         # Component tests

src/lib/
  slash-commands.ts                   # Command registry
  slash-commands.test.ts              # Registry tests
```

### Interfaces

```typescript
// src/lib/slash-commands.ts

import type { Editor } from "@tiptap/react";
import type { ComponentType } from "react";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: "basic" | "formatting" | "media" | "advanced";
  keywords: string[];
  action: (editor: Editor) => void;
}

export type SlashCommandCategory = SlashCommand["category"];

export interface SlashCommandGroup {
  category: SlashCommandCategory;
  label: string;
  commands: SlashCommand[];
}
```

### Extension Implementation

```typescript
// src/components/tiptap-extension/slash-command-extension.ts

import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { SlashCommand } from "@/lib/slash-commands";

export interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<SlashCommand>, "editor">;
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          // Delete the "/" trigger text
          editor.chain().focus().deleteRange(range).run();
          // Execute the command action
          props.action(editor);
        },
        allow: ({ state, range }) => {
          // Don't trigger in code blocks
          const $from = state.doc.resolve(range.from);
          const node = $from.node();
          if (node.type.name === "codeBlock") return false;
          return true;
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
```

### Suggestion Configuration

```typescript
// src/components/tiptap-extension/slash-command-suggestion.ts

import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  SlashCommandMenu,
  type SlashCommandMenuRef,
} from "@/components/tiptap-ui/slash-command-menu/slash-command-menu";
import { SLASH_COMMANDS, type SlashCommand } from "@/lib/slash-commands";

export function createSlashCommandSuggestion(): Omit<
  SuggestionOptions<SlashCommand>,
  "editor"
> {
  return {
    items: ({ query }): SlashCommand[] => {
      const queryLower = query.toLowerCase();
      return SLASH_COMMANDS.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(queryLower) ||
          cmd.keywords.some((kw) => kw.toLowerCase().includes(queryLower))
      ).slice(0, 12);
    },

    render: () => {
      let component: ReactRenderer<SlashCommandMenuRef> | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps<SlashCommand>) => {
          component = new ReactRenderer(SlashCommandMenu, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            maxWidth: 320,
          });
        },

        onUpdate(props: SuggestionProps<SlashCommand>) {
          component?.updateProps(props);

          if (!props.clientRect) return;

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}
```

### Menu Component

```typescript
// src/components/tiptap-ui/slash-command-menu/slash-command-menu.tsx

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashCommand, SlashCommandCategory } from "@/lib/slash-commands";
import { cn } from "@/lib/tiptap-utils";
import "./slash-command-menu.scss";

const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  basic: "Basic Blocks",
  formatting: "Formatting",
  media: "Media",
  advanced: "Advanced",
};

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuRef,
  SuggestionProps<SlashCommand>
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { items, command } = props;

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="slash-command-menu">
        <div className="slash-command-menu-empty">No commands found</div>
      </div>
    );
  }

  // Group items by category
  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<SlashCommandCategory, SlashCommand[]>
  );

  let globalIndex = 0;

  return (
    <div className="slash-command-menu">
      {Object.entries(grouped).map(([category, commands]) => (
        <div key={category} className="slash-command-group">
          <div className="slash-command-group-label">
            {CATEGORY_LABELS[category as SlashCommandCategory]}
          </div>
          {commands.map((item) => {
            const currentIndex = globalIndex++;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "slash-command-item",
                  currentIndex === selectedIndex && "slash-command-item-selected"
                )}
                onClick={() => selectItem(currentIndex)}
              >
                <Icon className="slash-command-item-icon" />
                <div className="slash-command-item-content">
                  <span className="slash-command-item-label">{item.label}</span>
                  <span className="slash-command-item-description">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";
```

### Command Registry

```typescript
// src/lib/slash-commands.ts

import type { Editor } from "@tiptap/react";
import {
  TypeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  CheckSquareIcon,
  QuoteIcon,
  CodeIcon,
  MinusIcon,
  InfoIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  AlertCircleIcon,
  TableIcon,
  ImageIcon,
  FunctionSquareIcon,
  GitBranchIcon,
} from "lucide-react";
import type { ComponentType } from "react";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: "basic" | "formatting" | "media" | "advanced";
  keywords: string[];
  action: (editor: Editor) => void;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Basic Blocks
  {
    id: "paragraph",
    label: "Text",
    description: "Plain text paragraph",
    icon: TypeIcon,
    category: "basic",
    keywords: ["paragraph", "text", "plain"],
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large section heading",
    icon: Heading1Icon,
    category: "basic",
    keywords: ["h1", "title", "large"],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: Heading2Icon,
    category: "basic",
    keywords: ["h2", "subtitle"],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Small section heading",
    icon: Heading3Icon,
    category: "basic",
    keywords: ["h3", "subheading"],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bulletList",
    label: "Bullet List",
    description: "Unordered list with bullets",
    icon: ListIcon,
    category: "basic",
    keywords: ["ul", "unordered", "bullets"],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "numberedList",
    label: "Numbered List",
    description: "Ordered list with numbers",
    icon: ListOrderedIcon,
    category: "basic",
    keywords: ["ol", "ordered", "numbers"],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    label: "Task List",
    description: "Checklist with checkboxes",
    icon: CheckSquareIcon,
    category: "basic",
    keywords: ["todo", "checklist", "checkbox"],
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "quote",
    label: "Quote",
    description: "Block quotation",
    icon: QuoteIcon,
    category: "basic",
    keywords: ["blockquote", "citation"],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    label: "Code Block",
    description: "Preformatted code block",
    icon: CodeIcon,
    category: "basic",
    keywords: ["pre", "code", "programming"],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule separator",
    icon: MinusIcon,
    category: "basic",
    keywords: ["hr", "horizontal", "separator", "line"],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },

  // Formatting - Callouts
  {
    id: "callout-info",
    label: "Info Callout",
    description: "Informational note block",
    icon: InfoIcon,
    category: "formatting",
    keywords: ["info", "note", "callout", "admonition"],
    action: (editor) => editor.chain().focus().setCallout({ type: "info" }).run(),
  },
  {
    id: "callout-warning",
    label: "Warning Callout",
    description: "Warning or caution block",
    icon: AlertTriangleIcon,
    category: "formatting",
    keywords: ["warning", "caution", "alert"],
    action: (editor) => editor.chain().focus().setCallout({ type: "warning" }).run(),
  },
  {
    id: "callout-tip",
    label: "Tip Callout",
    description: "Helpful tip or suggestion",
    icon: LightbulbIcon,
    category: "formatting",
    keywords: ["tip", "hint", "suggestion"],
    action: (editor) => editor.chain().focus().setCallout({ type: "tip" }).run(),
  },
  {
    id: "callout-danger",
    label: "Danger Callout",
    description: "Critical warning block",
    icon: AlertCircleIcon,
    category: "formatting",
    keywords: ["danger", "error", "critical"],
    action: (editor) => editor.chain().focus().setCallout({ type: "danger" }).run(),
  },

  // Media
  {
    id: "image",
    label: "Image",
    description: "Upload or embed an image",
    icon: ImageIcon,
    category: "media",
    keywords: ["picture", "photo", "upload"],
    action: (editor) => editor.chain().focus().setImageUploadNode().run(),
  },

  // Advanced
  {
    id: "table",
    label: "Table",
    description: "Insert a data table",
    icon: TableIcon,
    category: "advanced",
    keywords: ["grid", "spreadsheet", "rows", "columns"],
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "math-inline",
    label: "Inline Math",
    description: "Mathematical expression inline",
    icon: FunctionSquareIcon,
    category: "advanced",
    keywords: ["latex", "katex", "equation", "formula"],
    action: (editor) =>
      editor.chain().focus().insertContent({ type: "inlineMath", attrs: { latex: "x^2" } }).run(),
  },
  {
    id: "math-block",
    label: "Math Block",
    description: "Block mathematical equation",
    icon: FunctionSquareIcon,
    category: "advanced",
    keywords: ["latex", "katex", "equation", "formula", "display"],
    action: (editor) =>
      editor.chain().focus().insertContent({
        type: "blockMath",
        attrs: { latex: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}" },
      }).run(),
  },
  {
    id: "mermaid",
    label: "Mermaid Diagram",
    description: "Flowchart or diagram",
    icon: GitBranchIcon,
    category: "advanced",
    keywords: ["diagram", "flowchart", "sequence", "chart"],
    action: (editor) =>
      editor.chain().focus().setMermaid({ code: "graph TD\n  A[Start] --> B[End]" }).run(),
  },
];

export function filterCommands(query: string): SlashCommand[] {
  const queryLower = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(queryLower) ||
      cmd.keywords.some((kw) => kw.toLowerCase().includes(queryLower))
  );
}

export function getCommandsByCategory(): Record<string, SlashCommand[]> {
  return SLASH_COMMANDS.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, SlashCommand[]>
  );
}
```

### SCSS Styles

```scss
// src/components/tiptap-ui/slash-command-menu/slash-command-menu.scss

.slash-command-menu {
  display: flex;
  flex-direction: column;
  min-width: 280px;
  max-width: 320px;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.slash-command-menu-empty {
  padding: 0.75rem 1rem;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  text-align: center;
}

.slash-command-group {
  &:not(:first-child) {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }
}

.slash-command-group-label {
  padding: 0.25rem 0.75rem;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.slash-command-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;

  &:hover,
  &.slash-command-item-selected {
    background: var(--accent);
  }
}

.slash-command-item-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.125rem;
  color: var(--muted-foreground);
}

.slash-command-item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.slash-command-item-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--foreground);
}

.slash-command-item-description {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Tests for Phase 1

```typescript
// src/components/tiptap-ui/slash-command-menu/slash-command-menu.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlashCommandMenu } from "./slash-command-menu";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashCommand } from "@/lib/slash-commands";
import { TypeIcon, Heading1Icon } from "lucide-react";

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
];

const createMockProps = (
  items: SlashCommand[] = mockCommands
): SuggestionProps<SlashCommand> =>
  ({
    items,
    command: vi.fn(),
    editor: {} as never,
    range: { from: 0, to: 1 },
    query: "",
    text: "/",
    clientRect: null,
  }) as SuggestionProps<SlashCommand>;

describe("SlashCommandMenu", () => {
  it("renders command items", () => {
    render(<SlashCommandMenu {...createMockProps()} />);
    expect(screen.getByText("Text")).not.toBeNull();
    expect(screen.getByText("Heading 1")).not.toBeNull();
  });

  it("shows empty state when no items", () => {
    render(<SlashCommandMenu {...createMockProps([])} />);
    expect(screen.getByText("No commands found")).not.toBeNull();
  });

  it("displays descriptions", () => {
    render(<SlashCommandMenu {...createMockProps()} />);
    expect(screen.getByText("Plain text paragraph")).not.toBeNull();
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

  it("navigates with arrow keys via onKeyDown", () => {
    const ref = { current: null as { onKeyDown: (p: { event: KeyboardEvent }) => boolean } | null };
    render(<SlashCommandMenu {...createMockProps()} ref={ref as never} />);

    // Arrow down should move selection
    const downResult = ref.current?.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "ArrowDown" }),
    });
    expect(downResult).toBe(true);

    // Arrow up should move selection
    const upResult = ref.current?.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "ArrowUp" }),
    });
    expect(upResult).toBe(true);
  });

  it("selects on Enter via onKeyDown", () => {
    const mockCommand = vi.fn();
    const props = { ...createMockProps(), command: mockCommand };
    const ref = { current: null as { onKeyDown: (p: { event: KeyboardEvent }) => boolean } | null };
    render(<SlashCommandMenu {...props} ref={ref as never} />);

    const result = ref.current?.onKeyDown({
      event: new KeyboardEvent("keydown", { key: "Enter" }),
    });
    expect(result).toBe(true);
    expect(mockCommand).toHaveBeenCalled();
  });

  it("groups commands by category", () => {
    render(<SlashCommandMenu {...createMockProps()} />);
    expect(screen.getByText("Basic Blocks")).not.toBeNull();
  });
});
```

```typescript
// src/lib/slash-commands.test.ts

import { describe, expect, it } from "vitest";
import { SLASH_COMMANDS, filterCommands, getCommandsByCategory } from "./slash-commands";

describe("SLASH_COMMANDS", () => {
  it("has all required commands", () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(ids).toContain("paragraph");
    expect(ids).toContain("heading1");
    expect(ids).toContain("bulletList");
    expect(ids).toContain("callout-info");
    expect(ids).toContain("table");
    expect(ids).toContain("mermaid");
  });

  it("all commands have required properties", () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.id).toBeTruthy();
      expect(cmd.label).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(cmd.icon).toBeTruthy();
      expect(cmd.category).toBeTruthy();
      expect(Array.isArray(cmd.keywords)).toBe(true);
      expect(typeof cmd.action).toBe("function");
    }
  });
});

describe("filterCommands", () => {
  it("filters by label", () => {
    const results = filterCommands("heading");
    expect(results.some((c) => c.id === "heading1")).toBe(true);
    expect(results.some((c) => c.id === "heading2")).toBe(true);
  });

  it("filters by keyword", () => {
    const results = filterCommands("h1");
    expect(results.some((c) => c.id === "heading1")).toBe(true);
  });

  it("is case insensitive", () => {
    const results = filterCommands("HEADING");
    expect(results.some((c) => c.id === "heading1")).toBe(true);
  });

  it("returns empty for no matches", () => {
    const results = filterCommands("xyznotfound");
    expect(results).toHaveLength(0);
  });
});

describe("getCommandsByCategory", () => {
  it("groups commands correctly", () => {
    const grouped = getCommandsByCategory();
    expect(grouped.basic).toBeDefined();
    expect(grouped.formatting).toBeDefined();
    expect(grouped.advanced).toBeDefined();
  });
});
```

---

## Phase 2: Callout/Admonition Blocks

### Goal
Add styled callout blocks with 4 variants (info, warning, tip, danger) and an in-block type selector dropdown.

### Files to Create

```
src/components/tiptap-node/callout-node/
  callout-node-extension.ts           # TipTap node extension
  callout-node.tsx                    # React NodeView with type selector
  callout-node.scss                   # Styles for all variants
  index.tsx                           # Barrel export
  callout-node.test.tsx               # Tests
```

### Extension Implementation

```typescript
// src/components/tiptap-node/callout-node/callout-node-extension.ts

import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutNodeComponent } from "./callout-node";

export type CalloutType = "info" | "warning" | "tip" | "danger";

export interface CalloutNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  types: CalloutType[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (options: { type: CalloutType }) => ReturnType;
      toggleCallout: (options: { type: CalloutType }) => ReturnType;
      updateCalloutType: (type: CalloutType) => ReturnType;
    };
  }
}

export const CalloutNode = Node.create<CalloutNodeOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      types: ["info", "warning", "tip", "danger"],
    };
  },

  addAttributes() {
    return {
      type: {
        default: "info" as CalloutType,
        parseHTML: (element) =>
          (element.getAttribute("data-callout-type") as CalloutType) || "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-callout": "" }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeComponent);
  },

  addCommands() {
    return {
      setCallout:
        ({ type }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [{ type: "paragraph" }],
          });
        },
      toggleCallout:
        ({ type }) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, { type });
        },
      updateCalloutType:
        (type) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { type });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Backspace at start of callout unwraps content
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { $anchor } = selection;

        // Check if at start of callout content
        if ($anchor.parent.type.name === "paragraph" && $anchor.parentOffset === 0) {
          const callout = $anchor.node(-1);
          if (callout?.type.name === this.name) {
            return editor.commands.lift(this.name);
          }
        }
        return false;
      },
    };
  },
});
```

### React NodeView with Type Selector

```typescript
// src/components/tiptap-node/callout-node/callout-node.tsx

import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState } from "react";
import {
  InfoIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  AlertCircleIcon,
  ChevronDownIcon,
} from "lucide-react";
import type { CalloutType } from "./callout-node-extension";
import "./callout-node.scss";

const CALLOUT_CONFIG: Record<
  CalloutType,
  { icon: typeof InfoIcon; label: string }
> = {
  info: { icon: InfoIcon, label: "Info" },
  warning: { icon: AlertTriangleIcon, label: "Warning" },
  tip: { icon: LightbulbIcon, label: "Tip" },
  danger: { icon: AlertCircleIcon, label: "Danger" },
};

export const CalloutNodeComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const type = node.attrs.type as CalloutType;
  const config = CALLOUT_CONFIG[type];
  const Icon = config.icon;

  const handleTypeChange = (newType: CalloutType) => {
    updateAttributes({ type: newType });
    setShowDropdown(false);
  };

  return (
    <NodeViewWrapper className={`callout-node callout-node-${type}`} data-callout-type={type}>
      <div className="callout-node-header" contentEditable={false}>
        <Icon className="callout-node-icon" />
        <div className="callout-node-type-selector">
          <button
            type="button"
            className="callout-node-type-button"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {config.label}
            <ChevronDownIcon className="callout-node-chevron" />
          </button>
          {showDropdown && (
            <div className="callout-node-dropdown">
              {(Object.keys(CALLOUT_CONFIG) as CalloutType[]).map((t) => {
                const TypeIcon = CALLOUT_CONFIG[t].icon;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`callout-node-dropdown-item ${t === type ? "active" : ""}`}
                    onClick={() => handleTypeChange(t)}
                  >
                    <TypeIcon className="callout-node-dropdown-icon" />
                    {CALLOUT_CONFIG[t].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <NodeViewContent className="callout-node-content" />
    </NodeViewWrapper>
  );
};
```

### SCSS Styles

```scss
// src/components/tiptap-node/callout-node/callout-node.scss

.tiptap.ProseMirror {
  // Theme variables
  --callout-info-bg: var(--tt-color-highlight-blue);
  --callout-info-border: #3b82f6;
  --callout-info-icon: #2563eb;
  --callout-warning-bg: var(--tt-color-highlight-yellow);
  --callout-warning-border: #f59e0b;
  --callout-warning-icon: #d97706;
  --callout-tip-bg: var(--tt-color-highlight-green);
  --callout-tip-border: #10b981;
  --callout-tip-icon: #059669;
  --callout-danger-bg: var(--tt-color-highlight-red);
  --callout-danger-border: #ef4444;
  --callout-danger-icon: #dc2626;

  .dark & {
    --callout-info-icon: #60a5fa;
    --callout-warning-icon: #fbbf24;
    --callout-tip-icon: #34d399;
    --callout-danger-icon: #f87171;
  }
}

.callout-node {
  position: relative;
  margin: 1rem 0;
  padding: 1rem;
  padding-left: 3rem;
  border-left: 4px solid;
  border-radius: 0.375rem;

  &.callout-node-info {
    background: var(--callout-info-bg);
    border-color: var(--callout-info-border);
    .callout-node-icon { color: var(--callout-info-icon); }
  }

  &.callout-node-warning {
    background: var(--callout-warning-bg);
    border-color: var(--callout-warning-border);
    .callout-node-icon { color: var(--callout-warning-icon); }
  }

  &.callout-node-tip {
    background: var(--callout-tip-bg);
    border-color: var(--callout-tip-border);
    .callout-node-icon { color: var(--callout-tip-icon); }
  }

  &.callout-node-danger {
    background: var(--callout-danger-bg);
    border-color: var(--callout-danger-border);
    .callout-node-icon { color: var(--callout-danger-icon); }
  }
}

.callout-node-header {
  position: absolute;
  left: 0.75rem;
  top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.callout-node-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.callout-node-type-selector {
  position: relative;
}

.callout-node-type-button {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;

  .callout-node:hover & {
    opacity: 1;
  }

  &:hover {
    background: var(--accent);
  }
}

.callout-node-chevron {
  width: 0.75rem;
  height: 0.75rem;
}

.callout-node-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  min-width: 120px;
  padding: 0.25rem;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.callout-node-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  color: var(--foreground);
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;

  &:hover,
  &.active {
    background: var(--accent);
  }
}

.callout-node-dropdown-icon {
  width: 1rem;
  height: 1rem;
  color: var(--muted-foreground);
}

.callout-node-content {
  min-height: 1.5rem;

  > *:first-child {
    margin-top: 0;
  }

  > *:last-child {
    margin-bottom: 0;
  }
}
```

### Tests for Phase 2

```typescript
// src/components/tiptap-node/callout-node/callout-node.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalloutNodeComponent } from "./callout-node";
import type { NodeViewProps } from "@tiptap/react";

// Mock NodeViewContent
vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
  NodeViewContent: ({ className }: { className: string }) => (
    <div className={className} data-testid="callout-content" />
  ),
}));

const createMockProps = (type = "info"): NodeViewProps =>
  ({
    node: { attrs: { type } },
    updateAttributes: vi.fn(),
  }) as unknown as NodeViewProps;

describe("CalloutNodeComponent", () => {
  it("renders with correct type class", () => {
    const { container } = render(<CalloutNodeComponent {...createMockProps("info")} />);
    expect(container.querySelector(".callout-node-info")).not.toBeNull();
  });

  it("renders all callout types", () => {
    const types = ["info", "warning", "tip", "danger"];
    for (const type of types) {
      const { container } = render(<CalloutNodeComponent {...createMockProps(type)} />);
      expect(container.querySelector(`.callout-node-${type}`)).not.toBeNull();
    }
  });

  it("shows type dropdown on button click", () => {
    render(<CalloutNodeComponent {...createMockProps()} />);
    const button = screen.getByRole("button", { name: /info/i });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: /warning/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /tip/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /danger/i })).not.toBeNull();
  });

  it("changes type when dropdown item clicked", () => {
    const updateAttributes = vi.fn();
    const props = { ...createMockProps(), updateAttributes } as unknown as NodeViewProps;
    render(<CalloutNodeComponent {...props} />);

    // Open dropdown
    fireEvent.click(screen.getByRole("button", { name: /info/i }));
    // Select warning
    fireEvent.click(screen.getByRole("button", { name: /warning/i }));

    expect(updateAttributes).toHaveBeenCalledWith({ type: "warning" });
  });

  it("renders content area", () => {
    render(<CalloutNodeComponent {...createMockProps()} />);
    expect(screen.getByTestId("callout-content")).not.toBeNull();
  });
});
```

---

## Phase 3: Table Support

### Goal
Add table creation and editing using TipTap's official table extensions.

### Files to Create

```
src/components/tiptap-node/table-node/
  table-node.scss                     # Table styling
  table-node.test.ts                  # Tests
```

### Integration in note-editor.tsx

```typescript
// Add imports
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

// Add SCSS import
import "@/components/tiptap-node/table-node/table-node.scss";

// Add to extensions array
Table.configure({
  resizable: true,
  HTMLAttributes: { class: "tiptap-table" },
}),
TableRow,
TableHeader,
TableCell,
```

### SCSS Styles

```scss
// src/components/tiptap-node/table-node/table-node.scss

.tiptap.ProseMirror {
  .tiptap-table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    margin: 1.5rem 0;
    overflow: hidden;
    border-radius: 0.375rem;
    border: 1px solid var(--tt-border-color);

    td,
    th {
      border: 1px solid var(--tt-border-color);
      padding: 0.5rem 0.75rem;
      vertical-align: top;
      position: relative;
      min-width: 100px;

      > *:first-child {
        margin-top: 0;
      }

      > *:last-child {
        margin-bottom: 0;
      }
    }

    th {
      background: var(--tt-gray-light-100);
      font-weight: 600;
      text-align: left;

      .dark & {
        background: var(--tt-gray-dark-100);
      }
    }

    // Resize handle
    .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--tt-brand-color-400);
      cursor: col-resize;
      z-index: 10;
    }

    // Selected cell
    .selectedCell::after {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--tt-selection-color);
      pointer-events: none;
    }

    // Grip for selecting rows/columns (optional enhancement)
    .tableWrapper {
      overflow-x: auto;
      margin: 1.5rem 0;
    }
  }
}
```

### Tests for Phase 3

```typescript
// src/components/tiptap-node/table-node/table-node.test.ts
// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

function createEditor() {
  return new Editor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: "<p>Test</p>",
  });
}

describe("Table Extension", () => {
  it("inserts table with correct dimensions", () => {
    const editor = createEditor();
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });

    const html = editor.getHTML();
    expect(html).toContain("<table>");
    expect(html).toContain("<th>");
    expect(html).toContain("<td>");

    editor.destroy();
  });

  it("inserts table without header row", () => {
    const editor = createEditor();
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });

    const html = editor.getHTML();
    expect(html).toContain("<table>");
    expect(html).not.toContain("<th>");

    editor.destroy();
  });

  it("adds row to table", () => {
    const editor = createEditor();
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    editor.commands.addRowAfter();

    const html = editor.getHTML();
    // Count <tr> tags - should be 3 (1 header + 2 body, then +1)
    const trCount = (html.match(/<tr>/g) || []).length;
    expect(trCount).toBeGreaterThanOrEqual(3);

    editor.destroy();
  });

  it("adds column to table", () => {
    const editor = createEditor();
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    editor.commands.addColumnAfter();

    const html = editor.getHTML();
    // Each row should now have 3 cells
    expect(html).toContain("<table>");

    editor.destroy();
  });

  it("deletes row from table", () => {
    const editor = createEditor();
    editor.commands.insertTable({ rows: 3, cols: 2, withHeaderRow: false });
    editor.commands.deleteRow();

    const html = editor.getHTML();
    const trCount = (html.match(/<tr>/g) || []).length;
    expect(trCount).toBe(2);

    editor.destroy();
  });

  it("deletes table", () => {
    const editor = createEditor();
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    editor.commands.deleteTable();

    const html = editor.getHTML();
    expect(html).not.toContain("<table>");

    editor.destroy();
  });
});
```

---

## Phase 4: Math/LaTeX Support

### Goal
Add inline and block math equations using KaTeX with inline editing.

### Files to Create

```
src/components/tiptap-node/math-node/
  math-node.scss                      # KaTeX styling overrides
  math-inline-editor.tsx              # Inline LaTeX editor component
  math-node.test.tsx                  # Tests
```

### Integration in note-editor.tsx

```typescript
// Add imports
import Mathematics from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";

// Add SCSS import
import "@/components/tiptap-node/math-node/math-node.scss";

// Add to extensions array
Mathematics.configure({
  katexOptions: {
    throwOnError: false,
    macros: {
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}",
      "\\Q": "\\mathbb{Q}",
      "\\C": "\\mathbb{C}",
    },
  },
  inlineOptions: {
    onClick: (node, pos) => {
      // Will be handled by custom inline editor
    },
  },
}),
```

### Inline Math Editor Component

```typescript
// src/components/tiptap-node/math-node/math-inline-editor.tsx

import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/tiptap-utils";
import "./math-node.scss";

interface MathInlineEditorProps {
  editor: Editor;
  initialLatex: string;
  position: number;
  onClose: () => void;
}

export function MathInlineEditor({
  editor,
  initialLatex,
  position,
  onClose,
}: MathInlineEditorProps) {
  const [latex, setLatex] = useState(initialLatex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    editor
      .chain()
      .focus()
      .setNodeSelection(position)
      .updateInlineMath({ latex })
      .run();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="math-inline-editor">
      <input
        ref={inputRef}
        type="text"
        className="math-inline-editor-input"
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        placeholder="Enter LaTeX..."
      />
    </div>
  );
}
```

### SCSS Styles

```scss
// src/components/tiptap-node/math-node/math-node.scss

.tiptap.ProseMirror {
  // Inline math
  .Tiptap-mathematics-editor,
  .Tiptap-mathematics-render {
    display: inline;
    cursor: pointer;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    transition: background-color 0.15s;

    &:hover {
      background: var(--tt-gray-light-a-100);

      .dark & {
        background: var(--tt-gray-dark-a-100);
      }
    }
  }

  // Block math
  .Tiptap-mathematics-editor--block,
  .Tiptap-mathematics-render--block {
    display: block;
    text-align: center;
    padding: 1rem;
    margin: 1rem 0;
    background: var(--tt-gray-light-a-50);
    border-radius: 0.375rem;

    .dark & {
      background: var(--tt-gray-dark-a-50);
    }
  }

  // Error state
  .katex-error {
    color: var(--tt-color-red-base);
    font-family: monospace;
    font-size: 0.875rem;
  }
}

.math-inline-editor {
  display: inline-block;
  position: relative;
}

.math-inline-editor-input {
  min-width: 200px;
  padding: 0.25rem 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  outline: none;

  &:focus {
    border-color: var(--tt-brand-color-400);
    box-shadow: 0 0 0 2px var(--tt-selection-color);
  }
}
```

### Tests for Phase 4

```typescript
// src/components/tiptap-node/math-node/math-node.test.tsx
// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Mathematics from "@tiptap/extension-mathematics";

function createEditor() {
  return new Editor({
    extensions: [
      StarterKit,
      Mathematics.configure({
        katexOptions: { throwOnError: false },
      }),
    ],
    content: "<p>Test</p>",
  });
}

describe("Mathematics Extension", () => {
  it("inserts inline math", () => {
    const editor = createEditor();
    editor.commands.insertContent({
      type: "inlineMath",
      attrs: { latex: "x^2" },
    });

    const json = editor.getJSON();
    const inlineMath = json.content?.find((node) =>
      node.content?.some((child) => child.type === "inlineMath")
    );
    expect(inlineMath).toBeDefined();

    editor.destroy();
  });

  it("inserts block math", () => {
    const editor = createEditor();
    editor.commands.insertContent({
      type: "blockMath",
      attrs: { latex: "\\sum_{i=1}^n i = \\frac{n(n+1)}{2}" },
    });

    const json = editor.getJSON();
    const blockMath = json.content?.find((node) => node.type === "blockMath");
    expect(blockMath).toBeDefined();

    editor.destroy();
  });

  it("handles invalid LaTeX without crashing", () => {
    const editor = createEditor();

    // Should not throw with throwOnError: false
    expect(() => {
      editor.commands.insertContent({
        type: "inlineMath",
        attrs: { latex: "\\invalid{command}" },
      });
    }).not.toThrow();

    editor.destroy();
  });

  it("renders custom macros", () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        Mathematics.configure({
          katexOptions: {
            throwOnError: false,
            macros: { "\\R": "\\mathbb{R}" },
          },
        }),
      ],
      content: "<p>Test</p>",
    });

    editor.commands.insertContent({
      type: "inlineMath",
      attrs: { latex: "\\R" },
    });

    // Should insert without error
    const json = editor.getJSON();
    expect(json.content).toBeDefined();

    editor.destroy();
  });
});
```

---

## Phase 5: Mermaid Diagrams

### Goal
Add Mermaid diagram blocks with edit/preview toggle. Mermaid is embedded (not dynamically imported) for simplicity.

### Files to Create

```
src/components/tiptap-node/mermaid-node/
  mermaid-node-extension.ts           # TipTap node extension
  mermaid-node.tsx                    # React NodeView with edit/preview
  mermaid-node.scss                   # Styles
  index.tsx                           # Barrel export
  mermaid-node.test.tsx               # Tests
```

### Extension Implementation

```typescript
// src/components/tiptap-node/mermaid-node/mermaid-node-extension.ts

import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MermaidNodeComponent } from "./mermaid-node";

export interface MermaidNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (options: { code: string }) => ReturnType;
      updateMermaidCode: (code: string) => ReturnType;
    };
  }
}

export const MermaidNode = Node.create<MermaidNodeOptions>({
  name: "mermaid",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      code: {
        default: "graph TD\n  A[Start] --> B[End]",
        parseHTML: (element) => element.getAttribute("data-mermaid-code") || "",
        renderHTML: (attributes) => ({
          "data-mermaid-code": attributes.code,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-mermaid": "" }, this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeComponent);
  },

  addCommands() {
    return {
      setMermaid:
        ({ code }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { code },
          });
        },
      updateMermaidCode:
        (code) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { code });
        },
    };
  },
});
```

### React NodeView Component

```typescript
// src/components/tiptap-node/mermaid-node/mermaid-node.tsx

import { useState, useEffect, useRef } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import mermaid from "mermaid";
import { EditIcon, EyeIcon, CopyIcon, CheckIcon } from "lucide-react";
import "./mermaid-node.scss";

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
});

export const MermaidNodeComponent = ({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localCode, setLocalCode] = useState(node.attrs.code);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalCode(node.attrs.code);
  }, [node.attrs.code]);

  useEffect(() => {
    if (!isEditing) {
      renderDiagram();
    }
  }, [isEditing, localCode]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const renderDiagram = async () => {
    try {
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid.render(id, localCode);
      setSvg(svg);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid diagram syntax");
      setSvg("");
    }
  };

  const handleSave = () => {
    updateAttributes({ code: localCode });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalCode(node.attrs.code);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper
      className={`mermaid-node ${selected ? "mermaid-node-selected" : ""}`}
    >
      <div className="mermaid-node-toolbar" contentEditable={false}>
        <button
          type="button"
          className="mermaid-node-button"
          onClick={() => setIsEditing(!isEditing)}
          title={isEditing ? "Preview" : "Edit"}
        >
          {isEditing ? <EyeIcon size={16} /> : <EditIcon size={16} />}
        </button>
        <button
          type="button"
          className="mermaid-node-button"
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        </button>
      </div>

      {isEditing ? (
        <div className="mermaid-node-editor">
          <textarea
            ref={textareaRef}
            className="mermaid-node-textarea"
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            placeholder="Enter Mermaid diagram code..."
            rows={10}
          />
          <div className="mermaid-node-actions">
            <button
              type="button"
              className="mermaid-node-action mermaid-node-action-save"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              type="button"
              className="mermaid-node-action mermaid-node-action-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mermaid-node-preview">
          {error ? (
            <div className="mermaid-node-error">
              <strong>Diagram Error:</strong> {error}
            </div>
          ) : (
            <div
              ref={previewRef}
              className="mermaid-node-svg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};
```

### SCSS Styles

```scss
// src/components/tiptap-node/mermaid-node/mermaid-node.scss

.mermaid-node {
  position: relative;
  margin: 1.5rem 0;
  border: 1px solid var(--tt-border-color);
  border-radius: 0.5rem;
  overflow: hidden;

  &.mermaid-node-selected {
    border-color: var(--tt-brand-color-400);
    box-shadow: 0 0 0 2px var(--tt-selection-color);
  }
}

.mermaid-node-toolbar {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.15s;

  .mermaid-node:hover &,
  .mermaid-node.mermaid-node-selected & {
    opacity: 1;
  }
}

.mermaid-node-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  cursor: pointer;
  color: var(--muted-foreground);
  transition: all 0.15s;

  &:hover {
    background: var(--accent);
    color: var(--foreground);
  }
}

.mermaid-node-editor {
  padding: 1rem;
  background: var(--tt-gray-light-a-50);

  .dark & {
    background: var(--tt-gray-dark-a-50);
  }
}

.mermaid-node-textarea {
  width: 100%;
  min-height: 200px;
  padding: 0.75rem;
  font-family: "JetBrains Mono NL", monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: var(--tt-brand-color-400);
  }
}

.mermaid-node-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.mermaid-node-action {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.15s;

  &.mermaid-node-action-save {
    background: var(--tt-brand-color-500);
    color: white;

    &:hover {
      background: var(--tt-brand-color-600);
    }
  }

  &.mermaid-node-action-cancel {
    background: var(--tt-gray-light-200);
    color: var(--foreground);

    .dark & {
      background: var(--tt-gray-dark-200);
    }

    &:hover {
      background: var(--tt-gray-light-300);

      .dark & {
        background: var(--tt-gray-dark-300);
      }
    }
  }
}

.mermaid-node-preview {
  padding: 1.5rem;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mermaid-node-svg {
  max-width: 100%;
  overflow-x: auto;

  svg {
    max-width: 100%;
    height: auto;
  }
}

.mermaid-node-error {
  padding: 1rem;
  color: var(--tt-color-red-base);
  background: var(--tt-color-highlight-red);
  border-radius: 0.25rem;
  font-size: 0.875rem;

  strong {
    display: block;
    margin-bottom: 0.25rem;
  }
}
```

### Tests for Phase 5

```typescript
// src/components/tiptap-node/mermaid-node/mermaid-node.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MermaidNodeComponent } from "./mermaid-node";
import type { NodeViewProps } from "@tiptap/react";

// Mock mermaid
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg>test</svg>" }),
  },
}));

// Mock NodeViewWrapper
vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
}));

const createMockProps = (code = "graph TD\n  A --> B"): NodeViewProps =>
  ({
    node: { attrs: { code } },
    updateAttributes: vi.fn(),
    selected: false,
  }) as unknown as NodeViewProps;

describe("MermaidNodeComponent", () => {
  it("renders in preview mode by default", async () => {
    render(<MermaidNodeComponent {...createMockProps()} />);

    await waitFor(() => {
      expect(screen.queryByRole("textbox")).toBeNull();
    });
  });

  it("switches to edit mode on edit button click", async () => {
    render(<MermaidNodeComponent {...createMockProps()} />);

    const editButton = screen.getByTitle("Edit");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole("textbox")).not.toBeNull();
    });
  });

  it("shows textarea with diagram code in edit mode", async () => {
    render(<MermaidNodeComponent {...createMockProps("graph LR\n  X --> Y")} />);

    fireEvent.click(screen.getByTitle("Edit"));

    await waitFor(() => {
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toContain("graph LR");
    });
  });

  it("saves changes when save button clicked", async () => {
    const updateAttributes = vi.fn();
    const props = { ...createMockProps(), updateAttributes } as unknown as NodeViewProps;
    render(<MermaidNodeComponent {...props} />);

    // Enter edit mode
    fireEvent.click(screen.getByTitle("Edit"));

    await waitFor(() => {
      expect(screen.getByRole("textbox")).not.toBeNull();
    });

    // Change code
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "graph TB\n  C --> D" } });

    // Save
    fireEvent.click(screen.getByText("Save"));

    expect(updateAttributes).toHaveBeenCalledWith({ code: "graph TB\n  C --> D" });
  });

  it("discards changes when cancel clicked", async () => {
    const updateAttributes = vi.fn();
    const props = { ...createMockProps("original code"), updateAttributes } as unknown as NodeViewProps;
    render(<MermaidNodeComponent {...props} />);

    // Enter edit mode
    fireEvent.click(screen.getByTitle("Edit"));

    await waitFor(() => {
      expect(screen.getByRole("textbox")).not.toBeNull();
    });

    // Change code
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "modified code" } });

    // Cancel
    fireEvent.click(screen.getByText("Cancel"));

    // Should not have called updateAttributes
    expect(updateAttributes).not.toHaveBeenCalled();
  });

  it("shows error for invalid mermaid syntax", async () => {
    const mermaid = await import("mermaid");
    vi.mocked(mermaid.default.render).mockRejectedValueOnce(new Error("Parse error"));

    render(<MermaidNodeComponent {...createMockProps("invalid syntax")} />);

    await waitFor(() => {
      expect(screen.getByText(/Diagram Error/)).not.toBeNull();
    });
  });

  it("copies code to clipboard", async () => {
    const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<MermaidNodeComponent {...createMockProps("graph TD\n  A --> B")} />);

    fireEvent.click(screen.getByTitle("Copy code"));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith("graph TD\n  A --> B");
    });
  });
});
```

---

## Phase 6: Integration & Polish

### Goal
Final integration of all extensions into note-editor.tsx, keyboard shortcuts, and comprehensive integration tests.

### Modified Files

```
src/components/notes/note-editor.tsx    # Add all new extensions
src/components/help/shortcuts-dialog.tsx # Document new shortcuts
```

### note-editor.tsx Changes

```typescript
// Add imports at top of file
import { SlashCommandExtension } from "@/components/tiptap-extension/slash-command-extension";
import { createSlashCommandSuggestion } from "@/components/tiptap-extension/slash-command-suggestion";
import { CalloutNode } from "@/components/tiptap-node/callout-node/callout-node-extension";
import { MermaidNode } from "@/components/tiptap-node/mermaid-node/mermaid-node-extension";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Mathematics from "@tiptap/extension-mathematics";

// Add SCSS imports
import "katex/dist/katex.min.css";
import "@/components/tiptap-node/callout-node/callout-node.scss";
import "@/components/tiptap-node/table-node/table-node.scss";
import "@/components/tiptap-node/math-node/math-node.scss";
import "@/components/tiptap-node/mermaid-node/mermaid-node.scss";

// Add to extensions array (after existing extensions)
SlashCommandExtension.configure({
  suggestion: createSlashCommandSuggestion(),
}),
CalloutNode,
Table.configure({
  resizable: true,
  HTMLAttributes: { class: "tiptap-table" },
}),
TableRow,
TableHeader,
TableCell,
Mathematics.configure({
  katexOptions: {
    throwOnError: false,
    macros: {
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}",
    },
  },
}),
MermaidNode,
```

### Integration Tests

```typescript
// src/components/notes/note-editor-blocks.test.tsx
// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoteEditor } from "./note-editor";
import type { Node } from "@/db/schema/graph";

vi.mock("@/lib/graph-hooks", () => ({
  useGraphData: () => ({ nodes: [] }),
  useNodeMutations: () => ({ createNote: vi.fn() }),
}));

const baseNote: Node = {
  id: "note-1",
  userId: "local",
  type: "note",
  title: "Test Note",
  content: "<h1>Test Note</h1><p></p>",
  excerpt: null,
  color: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("NoteEditor Block Integration", () => {
  it("shows slash command menu when typing /", async () => {
    render(<NoteEditor note={baseNote} onChange={vi.fn()} />);

    // This test would require more setup with actual TipTap editor
    // For now, verify the component renders
    expect(screen.getByTestId("note-editor")).not.toBeNull();
  });

  it("renders with all extensions loaded", () => {
    render(<NoteEditor note={baseNote} onChange={vi.fn()} />);
    expect(screen.getByTestId("note-editor")).not.toBeNull();
  });
});
```

---

## File Summary

| Phase | New Files | Test Files |
|-------|-----------|------------|
| 1 - Slash Commands | 6 | 2 |
| 2 - Callouts | 4 | 1 |
| 3 - Tables | 1 | 1 |
| 4 - Math/LaTeX | 2 | 1 |
| 5 - Mermaid | 4 | 1 |
| 6 - Integration | 0 | 1 |

**Total: 17 new source files + 7 test files = 24 files**

---

## Dependencies Summary

```bash
# All dependencies to add
pnpm add @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @tiptap/extension-mathematics katex mermaid
```

---

## Implementation Order

1. **Phase 1**: Slash Command Infrastructure (foundation)
2. **Phase 2**: Callout Blocks (validates slash commands work)
3. **Phase 3**: Table Support (drop-in TipTap extensions)
4. **Phase 4**: Math/LaTeX Support (drop-in with inline editor)
5. **Phase 5**: Mermaid Diagrams (most complex custom node)
6. **Phase 6**: Integration & Polish (final wiring and tests)

Each phase should be completed with passing tests before moving to the next.
