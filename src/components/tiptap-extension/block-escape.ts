import { Extension } from "@tiptap/core";

export interface BlockEscapeOptions {
  types: string[];
}

export const BlockEscape = Extension.create<BlockEscapeOptions>({
  name: "blockEscape",

  addOptions() {
    return {
      types: ["table", "codeBlock", "callout", "mermaid", "blockquote", "taskList"],
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        const { selection } = this.editor.state;
        const { $from } = selection;

        let depth = $from.depth;
        while (depth > 0) {
          const node = $from.node(depth);
          if (this.options.types.includes(node.type.name)) {
            const endPos = $from.end(depth);
            return this.editor
              .chain()
              .focus()
              .insertContentAt(endPos + 1, { type: "paragraph" })
              .scrollIntoView()
              .run();
          }
          depth--;
        }
        return false;
      },
    };
  },
});
