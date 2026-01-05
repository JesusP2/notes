import { useState, useEffect } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { isLocalImageUrl, getImageUrl } from "@/lib/image-store";
import "./image-node.scss";

export const LocalImageComponent = ({ node, selected }: NodeViewProps) => {
  const { src, alt, title } = node.attrs;
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (!isLocalImageUrl(src)) {
      setResolvedSrc(src);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getImageUrl(src)
      .then((url) => {
        if (cancelled) return;
        if (url) {
          setResolvedSrc(url);
        } else {
          setError("Image not found");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load image");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (isLoading) {
    return (
      <NodeViewWrapper className="local-image-wrapper">
        <div className="local-image-loading">Loading image...</div>
      </NodeViewWrapper>
    );
  }

  if (error) {
    return (
      <NodeViewWrapper className="local-image-wrapper">
        <div className="local-image-error">{error}</div>
      </NodeViewWrapper>
    );
  }

  if (!resolvedSrc) {
    return (
      <NodeViewWrapper className="local-image-wrapper">
        <div className="local-image-placeholder">No image</div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="local-image-wrapper">
      <img
        src={resolvedSrc}
        alt={alt || ""}
        title={title || ""}
        className={selected ? "ProseMirror-selectednode" : ""}
        draggable="true"
        data-drag-handle
      />
    </NodeViewWrapper>
  );
};

export default LocalImageComponent;
