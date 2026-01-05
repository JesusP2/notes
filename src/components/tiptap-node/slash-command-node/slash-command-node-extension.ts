import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import type { SuggestionOptions } from "@tiptap/suggestion";
import Suggestion from "@tiptap/suggestion";
import type { SlashCommand } from "@/lib/slash-commands";

export type SlashCommandNodeOptions = {
  suggestion: Omit<SuggestionOptions<SlashCommand>, "editor">;
};

export const SlashCommandNode = Extension.create<SlashCommandNodeOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        allowSpaces: true,
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.action(editor);
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const isParagraph = $from.parent.type.name === "paragraph";
          const isStartOfNode = $from.parent.textContent.charAt(0) === "/";
          return isParagraph && isStartOfNode;
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommandSuggestion"),
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommandNode;
