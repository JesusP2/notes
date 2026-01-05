import { mergeAttributes, Node } from "@tiptap/react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MathNodeComponent } from "./math-node";

export interface MathNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    math: {
      setMath: (options?: { formula: string; displayMode?: boolean }) => ReturnType;
      setInlineMath: (options?: { formula: string }) => ReturnType;
      setDisplayMath: (options?: { formula: string }) => ReturnType;
    };
  }
}

export const MathNode = Node.create<MathNodeOptions>({
  name: "math",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      formula: {
        default: "",
      },
      displayMode: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: "math-node" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "math-node",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeComponent);
  },

  addCommands() {
    return {
      setMath:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
      setInlineMath:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { ...options, displayMode: false },
          });
        },
      setDisplayMath:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { ...options, displayMode: true },
          });
        },
    };
  },
});

export default MathNode;
