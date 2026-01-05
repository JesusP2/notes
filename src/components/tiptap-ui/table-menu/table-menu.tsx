import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { MoreVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import "./table-menu.scss";

interface TableMenuProps {
  editor: Editor;
}

export function TableMenu({ editor }: TableMenuProps) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
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
            top: rect.top - editorRect.top + 0.5,
            right: 8,
          });
          return;
        }
      }

      setPosition(null);
      setShowDropdown(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("transaction", updatePosition);

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("transaction", updatePosition);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editor, showDropdown]);

  const handleAddRow = () => {
    editor.chain().focus().addRowAfter().run();
    setShowDropdown(false);
  };

  const handleAddColumn = () => {
    editor.chain().focus().addColumnAfter().run();
    setShowDropdown(false);
  };

  const handleDeleteRow = () => {
    editor.chain().focus().deleteRow().run();
    setShowDropdown(false);
  };

  const handleDeleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
    setShowDropdown(false);
  };

  const handleDeleteTable = () => {
    editor.chain().focus().deleteTable().run();
    setShowDropdown(false);
  };

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className="table-floating-menu"
      style={{ top: position.top, right: position.right }}
    >
      <button
        type="button"
        className="table-menu-trigger"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Table options"
      >
        <MoreVerticalIcon className="table-menu-icon" />
      </button>
      {showDropdown && (
        <div className="table-menu-dropdown">
          <button
            type="button"
            className="table-menu-dropdown-item"
            onClick={handleAddRow}
            title="Add row"
          >
            <PlusIcon className="table-menu-icon" />
            <span>Add row</span>
          </button>
          <button
            type="button"
            className="table-menu-dropdown-item"
            onClick={handleAddColumn}
            title="Add column"
          >
            <PlusIcon className="table-menu-icon" />
            <span>Add column</span>
          </button>
          <div className="table-menu-separator" />
          <button
            type="button"
            className="table-menu-dropdown-item"
            onClick={handleDeleteRow}
            title="Delete row"
          >
            <Trash2Icon className="table-menu-icon" />
            <span>Delete row</span>
          </button>
          <button
            type="button"
            className="table-menu-dropdown-item"
            onClick={handleDeleteColumn}
            title="Delete column"
          >
            <Trash2Icon className="table-menu-icon" />
            <span>Delete column</span>
          </button>
          <div className="table-menu-separator" />
          <button
            type="button"
            className="table-menu-dropdown-item table-menu-dropdown-item-danger"
            onClick={handleDeleteTable}
            title="Delete table"
          >
            <Trash2Icon className="table-menu-icon" />
            <span>Delete table</span>
          </button>
        </div>
      )}
    </div>
  );
}
