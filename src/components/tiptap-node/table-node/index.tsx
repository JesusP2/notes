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
              .scrollIntoView()
              .run();
          }
          depth--;
        }
        return false;
      },
    };
  },

  onTransaction({ transaction }) {
    if (!transaction.docChanged) return;

    const { state, view } = this.editor;

    const { $from } = state.selection;
    let tablePos = -1;
    let depth = $from.depth;

    while (depth > 0) {
      const node = $from.node(depth);
      if (node.type.name === "table") {
        tablePos = $from.before(depth);
        break;
      }
      depth--;
    }

    if (tablePos < 0) return;

    const tableDOM = view.nodeDOM(tablePos);
    if (!tableDOM || !(tableDOM instanceof HTMLElement)) return;

    const tableWrapper = tableDOM.closest(".tableWrapper");
    if (!tableWrapper || !(tableWrapper instanceof HTMLElement)) return;

    const tableElement = tableDOM.querySelector("table");
    if (!tableElement || !tableElement.rows.length) return;

    const wrapperWidth = tableWrapper.offsetWidth;
    const tableWidth = tableElement.offsetWidth;

    requestAnimationFrame(() => {
      const totalWidth = Array.from(tableElement.rows).reduce((sum, row) => {
        return Math.max(
          sum,
          Array.from(row.cells).reduce(
            (rowSum, cell) => rowSum + (cell as HTMLElement).offsetWidth,
            0,
          ),
        );
      }, 0);

      const gap = wrapperWidth - totalWidth;

      if (tableWidth < wrapperWidth) {
        tableElement.style.width = `${wrapperWidth}px`;
      }

      if (gap > 1) {
        const lastColumnIndex = tableElement.rows[0].cells.length - 1;
        if (lastColumnIndex >= 0) {
          Array.from(tableElement.rows).forEach((row) => {
            const lastCell = row.cells[lastColumnIndex];
            if (lastCell instanceof HTMLElement) {
              const currentWidth = lastCell.offsetWidth;
              lastCell.style.width = `${currentWidth + gap}px`;
            }
          });
        }
      }
    });
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
