import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  SlashCommandMenu,
  type SlashCommandMenuRef,
} from "@/components/tiptap-ui/slash-command-menu/slash-command-menu";
import { filterCommands, type SlashCommand } from "@/lib/slash-commands";

export function createSlashCommandSuggestion(): Omit<SuggestionOptions<SlashCommand>, "editor"> {
  return {
    items: ({ query }): SlashCommand[] => {
      return filterCommands(query);
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

        onUpdate(props: SuggestionProps<SlashCommand>) {
          component?.updateProps(props);

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
