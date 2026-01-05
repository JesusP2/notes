import { mergeAttributes, Node } from "@tiptap/react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutNodeComponent } from "./callout-node";

export type CalloutType = "info" | "warning" | "tip" | "danger";

export interface CalloutNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  types: CalloutType[];
}

export const CalloutNode = Node.create<CalloutNodeOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      types: ["info", "warning", "tip", "danger"],
    };
  },

  addAttributes() {
    return {
      type: {
        default: "info" as CalloutType,
        parseHTML: (element) =>
          (element.getAttribute("data-callout-type") as CalloutType) || "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-callout": "" },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeComponent);
  },
});

export default CalloutNode;
