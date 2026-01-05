import { useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import "katex/dist/katex.min.css";
import "./math-node.scss";

export const MathNodeComponent = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const formula = node.attrs.formula;
  const displayMode = node.attrs.displayMode;

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode,
          throwOnError: false,
          errorColor: "#cc0000",
        });
      } catch {
        containerRef.current.textContent = formula;
      }
    }
  }, [formula, displayMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleFormulaChange = (newFormula: string) => {
    updateAttributes({ formula: newFormula });
  };

  const handleEditFormula = () => {
    setShowEditor(!showEditor);
    setShowMenu(false);
  };

  const handleDelete = () => {
    deleteNode();
  };

  return (
    <NodeViewWrapper
      className={`math-node ${displayMode ? "math-node-display" : "math-node-inline"}`}
      contentEditable={false}
    >
      {formula ? (
        <span
          ref={containerRef}
          className="math-node-content"
          data-formula={formula}
          data-display-mode={displayMode}
        />
      ) : (
        <span className="math-node-placeholder">LaTeX</span>
      )}
      <div className="math-node-menu-container" ref={menuRef} contentEditable={false}>
        <button
          type="button"
          className="math-node-menu-btn"
          onClick={() => setShowMenu(!showMenu)}
          title="More options"
        >
          <MoreVerticalIcon className="math-node-menu-icon" />
        </button>
        {showMenu && (
          <div className="math-node-dropdown">
            <button type="button" className="math-node-dropdown-item" onClick={handleEditFormula}>
              <PencilIcon className="math-node-dropdown-icon" />
              <span>{showEditor ? "Hide editor" : "Edit formula"}</span>
            </button>
            <button
              type="button"
              className="math-node-dropdown-item math-node-dropdown-item-danger"
              onClick={handleDelete}
            >
              <Trash2Icon className="math-node-dropdown-icon" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
      {showEditor && (
        <input
          type="text"
          className="math-node-input"
          value={formula}
          onChange={(e) => handleFormulaChange(e.target.value)}
          placeholder={displayMode ? "Enter LaTeX formula..." : "LaTeX"}
          aria-label="Math formula input"
        />
      )}
    </NodeViewWrapper>
  );
};

export default MathNodeComponent;
