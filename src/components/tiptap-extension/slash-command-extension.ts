import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { SlashCommand } from "@/lib/slash-commands";

export interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<SlashCommand>, "editor">;
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: "slashCommand",
  priority: 999,

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.action(editor);
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const node = $from.node();
          if (node.type.name === "codeBlock") return false;
          return true;
        },
      } as SuggestionOptions<SlashCommand>,
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

export default SlashCommandExtension;

