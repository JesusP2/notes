import { ChevronRight, FileText, Folder, Link2, Tag } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Node } from "@/db/schema/graph";
import { useNodeEdges, useNodeMutations } from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";

interface TreeNodeProps {
  node: Node;
  level: number;
  isExpanded?: boolean;
  isExpandable?: boolean;
  onToggle?: () => void;
  onSelect?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}

function nodeIcon(type: Node["type"]) {
  switch (type) {
    case "folder":
      return <Folder className="size-3.5" />;
    case "tag":
      return <Tag className="size-3.5" />;
    default:
      return <FileText className="size-3.5" />;
  }
}

export function TreeNode({
  node,
  level,
  isExpanded = false,
  isExpandable = false,
  onToggle,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver = false,
}: TreeNodeProps) {
  const { outgoing } = useNodeEdges(node.id);
  const { updateNode } = useNodeMutations();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const parentCount = outgoing.filter((edge) => edge.type === "part_of").length;
  const showMultiParent = node.type === "note" && parentCount > 1;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setEditValue(node.title);
      setIsEditing(true);
    },
    [node.title],
  );

  const handleRenameSubmit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.title) {
      updateNode(node.id, { title: trimmed });
    }
    setIsEditing(false);
  }, [editValue, node.id, node.title, updateNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRenameSubmit();
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setEditValue(node.title);
      }
    },
    [handleRenameSubmit, node.title],
  );

  return (
    <div
      className={cn("flex items-center gap-1 text-xs group", isDragOver && "bg-primary/10 rounded")}
      data-node-id={node.id}
      data-node-type={node.type}
      style={{ paddingLeft: `${level * 12}px` }}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
    >
      {isExpandable ? (
        <button
          aria-label={`Toggle ${node.type} ${node.title}`}
          className="text-muted-foreground hover:text-foreground flex size-4 items-center justify-center"
          onClick={onToggle}
          type="button"
        >
          <ChevronRight className={cn("size-3 transition-transform", isExpanded && "rotate-90")} />
        </button>
      ) : (
        <span className="size-4" />
      )}

      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          className="h-6 text-xs py-0 px-1.5 flex-1"
        />
      ) : (
        <button
          className="hover:bg-muted flex flex-1 items-center gap-2 rounded px-1.5 py-1 text-left"
          onClick={onSelect}
          onDoubleClick={handleDoubleClick}
          type="button"
        >
          <span className="text-muted-foreground">{nodeIcon(node.type)}</span>
          <span data-testid="tree-node-label" className="truncate">
            {node.title}
          </span>
        </button>
      )}

      {showMultiParent && !isEditing && (
        <span
          aria-label="Multiple parents"
          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid="multi-parent-indicator"
          title="Multiple parents"
        >
          <Link2 className="size-3" />
        </span>
      )}
    </div>
  );
}
