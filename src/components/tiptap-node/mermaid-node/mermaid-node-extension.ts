import { mergeAttributes, Node } from "@tiptap/react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MermaidNodeComponent } from "./mermaid-node";

export interface MermaidNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (options?: { code: string }) => ReturnType;
    };
  }
}

export const MermaidNode = Node.create<MermaidNodeOptions>({
  name: "mermaid",
  group: "block",
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      code: {
        default: "graph TD\nA[Start] --> B[End]",
      },
    };
  },

  parseHTML() {
    return [{ tag: "mermaid-node" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mermaid-node",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeComponent);
  },

  addCommands() {
    return {
      setMermaid:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default MermaidNode;
