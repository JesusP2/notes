import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Trash2Icon, PlusIcon } from "lucide-react";
import "./table-menu.scss";

interface TableMenuProps {
  editor: Editor;
}

export function TableMenu({ editor }: TableMenuProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const { selection } = editor.state;
      const { $from } = selection;

      let tableNode = null;
      let tablePos = -1;
      let depth = $from.depth;

      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === "table") {
          tableNode = node;
          tablePos = $from.before(depth);
          break;
        }
        depth--;
      }

      if (tableNode && tablePos >= 0) {
        const dom = editor.view.nodeDOM(tablePos);
        if (dom && dom instanceof HTMLElement) {
          const rect = dom.getBoundingClientRect();
          const editorRect = editor.view.dom.getBoundingClientRect();
          setPosition({
            top: rect.top - editorRect.top,
            left: rect.right - editorRect.left + 8,
          });
          setIsVisible(true);
          return;
        }
      }

      setIsVisible(false);
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("transaction", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("transaction", updatePosition);
    };
  }, [editor]);

  if (!isVisible || !position) return null;

  return (
    <div
      ref={menuRef}
      className="table-floating-menu"
      style={{ top: position.top, right: 0 }}
      contentEditable={false}
    >
      <button
        type="button"
        className="table-menu-btn"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add row"
      >
        <PlusIcon className="table-menu-icon" />
        <span>Row</span>
      </button>
      <button
        type="button"
        className="table-menu-btn"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add column"
      >
        <PlusIcon className="table-menu-icon" />
        <span>Col</span>
      </button>
      <div className="table-menu-separator" />
      <button
        type="button"
        className="table-menu-btn"
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete row"
      >
        <Trash2Icon className="table-menu-icon" />
        <span>Row</span>
      </button>
      <button
        type="button"
        className="table-menu-btn"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete column"
      >
        <Trash2Icon className="table-menu-icon" />
        <span>Col</span>
      </button>
      <div className="table-menu-separator" />
      <button
        type="button"
        className="table-menu-btn table-menu-btn-danger"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete table"
      >
        <Trash2Icon className="table-menu-icon" />
        <span>Table</span>
      </button>
    </div>
  );
}
