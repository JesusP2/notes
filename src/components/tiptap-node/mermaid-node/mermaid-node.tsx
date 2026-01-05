import { useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import mermaid from "mermaid";
import { ChevronDownIcon, ChevronUpIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import "./mermaid-node.scss";

export const MermaidNodeComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isResizing, setIsResizing] = useState(false);
  const code = node.attrs.code;
  const height = node.attrs.height || 300;
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === "dark" ? "dark" : "default",
      securityLevel: "loose",
    });
  }, [resolvedTheme]);

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
  }, [code, resolvedTheme]);

  const handleCodeChange = (newCode: string) => {
    updateAttributes({ code: newCode });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(100, startHeight + delta);
      updateAttributes({ height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <NodeViewWrapper className={`mermaid-node ${isResizing ? "mermaid-node-resizing" : ""}`}>
      <div className="mermaid-node-toolbar" contentEditable={false}>
        <div className="mermaid-node-zoom-controls">
          <button
            type="button"
            className="mermaid-node-btn"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOutIcon className="mermaid-node-btn-icon" />
          </button>
          <span className="mermaid-node-zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="mermaid-node-btn"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomInIcon className="mermaid-node-btn-icon" />
          </button>
          <button
            type="button"
            className="mermaid-node-btn"
            onClick={handleZoomReset}
            title="Reset zoom"
          >
            <RotateCcwIcon className="mermaid-node-btn-icon" />
          </button>
        </div>
        <button
          type="button"
          className="mermaid-node-btn mermaid-node-toggle"
          onClick={() => setShowEditor(!showEditor)}
        >
          {showEditor ? (
            <>
              <ChevronUpIcon className="mermaid-node-btn-icon" />
              <span>Hide code</span>
            </>
          ) : (
            <>
              <ChevronDownIcon className="mermaid-node-btn-icon" />
              <span>Edit code</span>
            </>
          )}
        </button>
      </div>
      <div
        className="mermaid-node-preview"
        ref={containerRef}
        style={{ height: `${height}px` }}
      >
        {error ? (
          <div className="mermaid-node-error">{error}</div>
        ) : svg ? (
          <div
            className="mermaid-node-svg"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="mermaid-node-loading">Loading diagram...</div>
        )}
      </div>
      <div
        className="mermaid-node-resizer"
        contentEditable={false}
        onMouseDown={handleResizeStart}
      />
      {showEditor && (
        <textarea
          className="mermaid-node-editor"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="Enter Mermaid diagram code..."
          aria-label="Mermaid diagram code editor"
        />
      )}
    </NodeViewWrapper>
  );
};

export default MermaidNodeComponent;
