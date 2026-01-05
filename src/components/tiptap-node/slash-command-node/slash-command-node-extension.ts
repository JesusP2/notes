import { mergeAttributes, Node } from "@tiptap/core";
import { createSlashCommandSuggestion } from "@/components/tiptap-extension/slash-command-suggestion";

export type SlashCommandNodeOptions = {
  HTMLAttributes: Record<string, unknown>;
};

export const SlashCommandNode = Node.create<SlashCommandNodeOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: createSlashCommandSuggestion(),
    };
  },

  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: "span[data-slash-command]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-slash-command": "" }), 0];
  },

  addNodeView() {
    return () => {
      const span = document.createElement("span");
      span.setAttribute("data-slash-command", "");
      span.style.cssText = "position: absolute; width: 0; height: 0; overflow: hidden;";
      return { dom: span, contentDOM: undefined };
    };
  },
});

export default SlashCommandNode;
