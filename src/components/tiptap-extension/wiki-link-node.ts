import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { SuggestionOptions } from "@tiptap/suggestion";
import Suggestion from "@tiptap/suggestion";

export type WikiLinkOptions = {
  HTMLAttributes: Record<string, unknown>;
  renderText: (props: { options: WikiLinkOptions; node: ProseMirrorNode }) => string;
  renderHTML: (props: { options: WikiLinkOptions; node: ProseMirrorNode }) => string;
  suggestion: Omit<SuggestionOptions, "editor">;
};

export const WikiLinkNode = Node.create<WikiLinkOptions>({
  name: "wikiLink",

  addOptions() {
    return {
      HTMLAttributes: {
        class: "wiki-link",
      },
      renderText({ node }) {
        return `[[${node.attrs.title}]]`;
      },
      renderHTML({ node }) {
        return node.attrs.title;
      },
      suggestion: {
        char: "[[",
        allowSpaces: true,
        command: ({ editor, range, props }) => {
          // Increase range.to by one when the next node is of type "text"
          // and starts with a space character
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(" ");

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();

          window.getSelection()?.collapseToEnd();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          if (!type) return false;
          return !!$from.parent.type.contentMatch.matchType(type);
        },
      },
    };
  },

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) => {
          if (!attributes.noteId) {
            return {};
          }
          return {
            "data-note-id": attributes.noteId,
          };
        },
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {};
          }
          return {
            "data-title": attributes.title,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-wiki-link]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const href = node.attrs.noteId ? `/notes/${node.attrs.noteId}` : "#";
    const displayText = this.options.renderHTML({
      options: this.options,
      node,
    });

    return [
      "a",
      mergeAttributes(
        { "data-wiki-link": "" },
        this.options.HTMLAttributes,
        HTMLAttributes,
        { href }
      ),
      displayText,
    ];
  },

  renderText({ node }) {
    return this.options.renderText({ options: this.options, node });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isWikiLink = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isWikiLink = true;
              tr.insertText("[[", pos, pos + node.nodeSize);
              return false;
            }
          });

          return isWikiLink;
        }),
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
