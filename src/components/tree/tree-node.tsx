import { ChevronRight, FileText, Folder, Frame, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NotePreviewCard } from "@/components/notes/note-preview-card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import type { Node } from "@/db/schema/graph";
import { useNodeEdges, useNodeMutations } from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";

interface TreeNodeProps {
  node: Node;
  level: number;
  isExpanded?: boolean;
  isExpandable?: boolean;
  isActive?: boolean;
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
    case "tag":
      return <Folder className="size-3.5" />;
    case "canvas":
      return <Frame className="size-3.5" />;
    default:
      return <FileText className="size-3.5" />;
  }
}

export function TreeNode({
  node,
  level,
  isExpanded = false,
  isExpandable = false,
  isActive = false,
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

  const parentCount = outgoing.filter((edge) => edge.type === "tagged_with").length;
  const showMultiParent = (node.type === "note" || node.type === "canvas") && parentCount > 1;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(node.title);
    setIsEditing(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.title) {
      updateNode(node.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(node.title);
    }
  };

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
          className="h-6 text-xs py-0 px-1.5 flex-1 min-w-0"
        />
      ) : (
        (() => {
          const button = (
            <button
              className={cn(
                "flex flex-1 min-w-0 items-center gap-2 rounded px-1.5 py-1 text-left",
                isActive ? "bg-primary/10 text-primary" : "hover:bg-muted",
              )}
              onClick={onSelect}
              onDoubleClick={handleDoubleClick}
              type="button"
            >
              <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>
                {nodeIcon(node.type)}
              </span>
              <span data-testid="tree-node-label" className="min-w-0 flex-1 truncate">
                {node.title}
              </span>
            </button>
          );

          if (node.type !== "note") {
            return button;
          }

          return (
            <HoverCard>
              <HoverCardTrigger render={button} />
              <HoverCardContent side="right" align="start" className="w-72">
                <NotePreviewCard noteId={node.id} />
              </HoverCardContent>
            </HoverCard>
          );
        })()
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
