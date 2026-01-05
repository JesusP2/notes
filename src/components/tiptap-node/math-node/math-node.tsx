import { useEffect, useRef } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./math-node.scss";

export const MathNodeComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
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

  const handleFormulaChange = (newFormula: string) => {
    updateAttributes({ formula: newFormula });
  };

  return (
    <NodeViewWrapper
      className={`math-node ${displayMode ? "math-node-display" : "math-node-inline"}`}
      contentEditable={false}
    >
      <span
        ref={containerRef}
        className="math-node-content"
        data-formula={formula}
        data-display-mode={displayMode}
      />
      <input
        type="text"
        className="math-node-input"
        value={formula}
        onChange={(e) => handleFormulaChange(e.target.value)}
        placeholder={displayMode ? "Enter LaTeX formula..." : "LaTeX"}
        aria-label="Math formula input"
      />
    </NodeViewWrapper>
  );
};

export default MathNodeComponent;
