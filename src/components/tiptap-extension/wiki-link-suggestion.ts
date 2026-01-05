import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { Node } from "@/db/schema/graph";
import {
  WikiLinkList,
  type WikiLinkListRef,
} from "@/components/tiptap-ui/wiki-link-list/wiki-link-list";

export interface WikiLinkSuggestionItem {
  noteId: string;
  title: string;
}

export interface WikiLinkSuggestionOptions {
  getNotes: () => Node[];
  onCreateNote?: (title: string) => Promise<Node | null>;
}

export function createWikiLinkSuggestion(
  options: WikiLinkSuggestionOptions,
): Omit<SuggestionOptions<WikiLinkSuggestionItem>, "editor"> {
  return {
    items: ({ query }: any) => {
      const notes = (options as any).getNotes();

      if (query.startsWith("/") && (options as any).allowSlash) {
        return [];
      }

      const queryLower = query.toLowerCase();

      return notes
        .filter(
          (node: any) => node.type === "note" && node.title.toLowerCase().includes(queryLower),
        )
        .slice(0, 10)
        .map((note: any) => ({
          noteId: note.id,
          title: note.title,
        }));
    },

    render: () => {
      let component: ReactRenderer<WikiLinkListRef> | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps<WikiLinkSuggestionItem>) => {
          component = new ReactRenderer(WikiLinkList, {
            props: {
              ...props,
              onCreateNote: options.onCreateNote,
            },
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props: SuggestionProps<WikiLinkSuggestionItem>) {
          component?.updateProps({
            ...props,
            onCreateNote: options.onCreateNote,
          });

          if (!props.clientRect) {
            return;
          }

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
