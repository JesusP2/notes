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

export type SlashCommandCategory = "basic" | "formatting" | "media" | "advanced";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: SlashCommandCategory;
  keywords: string[];
  action: (editor: Editor) => void;
}

export interface SlashCommandGroup {
  category: SlashCommandCategory;
  label: string;
  commands: SlashCommand[];
}

export const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  basic: "Basic Blocks",
  formatting: "Formatting",
  media: "Media",
  advanced: "Advanced",
};

export const SLASH_COMMANDS: SlashCommand[] = [
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
  {
    id: "callout-info",
    label: "Info Callout",
    description: "Informational note block",
    icon: InfoIcon,
    category: "formatting",
    keywords: ["info", "note", "callout", "admonition"],
    action: (editor) => {
      editor.chain().focus().insertContent({ type: "callout", attrs: { type: "info" } }).run();
    },
  },
  {
    id: "callout-warning",
    label: "Warning Callout",
    description: "Warning or caution block",
    icon: AlertTriangleIcon,
    category: "formatting",
    keywords: ["warning", "caution", "alert"],
    action: (editor) => {
      editor.chain().focus().insertContent({ type: "callout", attrs: { type: "warning" } }).run();
    },
  },
  {
    id: "callout-tip",
    label: "Tip Callout",
    description: "Helpful tip or suggestion",
    icon: LightbulbIcon,
    category: "formatting",
    keywords: ["tip", "hint", "suggestion"],
    action: (editor) => {
      editor.chain().focus().insertContent({ type: "callout", attrs: { type: "tip" } }).run();
    },
  },
  {
    id: "callout-danger",
    label: "Danger Callout",
    description: "Critical warning block",
    icon: AlertCircleIcon,
    category: "formatting",
    keywords: ["danger", "error", "critical"],
    action: (editor) => {
      editor.chain().focus().insertContent({ type: "callout", attrs: { type: "danger" } }).run();
    },
  },
  {
    id: "image",
    label: "Image",
    description: "Upload or embed an image",
    icon: ImageIcon,
    category: "media",
    keywords: ["picture", "photo", "upload"],
    action: (editor) => {
      const cmd = editor.commands as Record<string, unknown>;
      if (typeof cmd.setImageUploadNode === "function") {
        (cmd.setImageUploadNode as () => boolean)();
      }
    },
  },
  {
    id: "table",
    label: "Table",
    description: "Insert a data table",
    icon: TableIcon,
    category: "advanced",
    keywords: ["grid", "spreadsheet", "rows", "columns"],
    action: (editor) => {
      const cmd = editor.commands as Record<string, unknown>;
      if (typeof cmd.insertTable === "function") {
        (cmd.insertTable as (opts: { rows: number; cols: number; withHeaderRow: boolean }) => boolean)({
          rows: 3,
          cols: 3,
          withHeaderRow: true,
        });
      }
    },
  },
  {
    id: "math-inline",
    label: "Inline Math",
    description: "Mathematical expression inline",
    icon: FunctionSquareIcon,
    category: "advanced",
    keywords: ["latex", "katex", "equation", "formula"],
    action: (editor) => {
      if (editor.schema.nodes.math) {
        editor
          .chain()
          .focus()
          .insertContent({ type: "math", attrs: { formula: "x^2", displayMode: false } })
          .run();
      }
    },
  },
  {
    id: "math-block",
    label: "Math Block",
    description: "Block mathematical equation",
    icon: FunctionSquareIcon,
    category: "advanced",
    keywords: ["latex", "katex", "equation", "formula", "display"],
    action: (editor) => {
      if (editor.schema.nodes.math) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "math",
            attrs: { formula: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}", displayMode: true },
          })
          .run();
      }
    },
  },
  {
    id: "mermaid",
    label: "Mermaid Diagram",
    description: "Flowchart or diagram",
    icon: GitBranchIcon,
    category: "advanced",
    keywords: ["diagram", "flowchart", "sequence", "chart"],
    action: (editor) => {
      if (editor.schema.nodes.mermaid) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "mermaid",
            attrs: { code: "graph TD\n  A[Start] --> B[End]" },
          })
          .run();
      }
    },
  },
];

export function filterCommands(query: string): SlashCommand[] {
  if (!query) return SLASH_COMMANDS;

  const queryLower = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(queryLower) ||
      cmd.keywords.some((kw) => kw.toLowerCase().includes(queryLower))
  );
}

export function getCommandsByCategory(): Record<SlashCommandCategory, SlashCommand[]> {
  return SLASH_COMMANDS.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<SlashCommandCategory, SlashCommand[]>
  );
}

export function getAvailableCommands(editor: Editor): SlashCommand[] {
  return SLASH_COMMANDS.filter((command) => {
    if (command.category === "basic") return true;

    switch (command.id) {
      case "callout-info":
      case "callout-warning":
      case "callout-tip":
      case "callout-danger":
        return !!editor.schema.nodes.callout;
      case "image":
        return typeof (editor.commands as Record<string, unknown>).setImageUploadNode === "function";
      case "table":
        return !!editor.schema.nodes.table;
      case "math-inline":
      case "math-block":
        return !!editor.schema.nodes.math;
      case "mermaid":
        return !!editor.schema.nodes.mermaid;
      default:
        return true;
    }
  });
}
