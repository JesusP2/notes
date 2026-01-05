import { useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import mermaid from "mermaid";
import "./mermaid-node.scss";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

export const MermaidNodeComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const code = node.attrs.code;

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };

    renderDiagram();
  }, [code]);

  const handleCodeChange = (newCode: string) => {
    updateAttributes({ code: newCode });
  };

  return (
    <NodeViewWrapper className="mermaid-node">
      <div className="mermaid-node-preview" ref={containerRef}>
        {error ? (
          <div className="mermaid-node-error">{error}</div>
        ) : svg ? (
          <div
            className="mermaid-node-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="mermaid-node-loading">Loading diagram...</div>
        )}
      </div>
      <textarea
        className="mermaid-node-editor"
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        placeholder="Enter Mermaid diagram code..."
        aria-label="Mermaid diagram code editor"
      />
    </NodeViewWrapper>
  );
};

export default MermaidNodeComponent;
