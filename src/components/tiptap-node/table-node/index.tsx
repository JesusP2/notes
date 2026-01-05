import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

const CustomTable = Table.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      "Mod-Enter": () => {
        const { selection } = this.editor.state;
        const { $from } = selection;

        let depth = $from.depth;
        while (depth > 0) {
          const node = $from.node(depth);
          if (node.type.name === "table") {
            const endPos = $from.end(depth);
            return this.editor
              .chain()
              .focus()
              .insertContentAt(endPos + 1, { type: "paragraph" })
              .run();
          }
          depth--;
        }
        return false;
      },
    };
  },
});

export const tableExtensions = [
  CustomTable.configure({
    resizable: true,
    lastColumnResizable: true,
    allowTableNodeSelection: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

export default tableExtensions;
