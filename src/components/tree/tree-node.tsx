import { ChevronRight, FileText, Folder, Link2, Tag } from "lucide-react";
import type { Node } from "@/db/schema/graph";
import { useNodeEdges } from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";

interface TreeNodeProps {
  node: Node;
  level: number;
  isExpanded?: boolean;
  isExpandable?: boolean;
  onToggle?: () => void;
  onSelect?: () => void;
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
}: TreeNodeProps) {
  const { outgoing } = useNodeEdges(node.id);
  const parentCount = outgoing.filter((edge) => edge.type === "part_of").length;
  const showMultiParent = node.type === "note" && parentCount > 1;
  const toggleLabel = `Toggle ${node.type} ${node.title}`;

  return (
    <div
      className="flex items-center gap-1 text-xs"
      data-node-id={node.id}
      data-node-type={node.type}
      style={{ paddingLeft: `${level * 12}px` }}
    >
      {isExpandable ? (
        <button
          aria-label={toggleLabel}
          className="text-muted-foreground hover:text-foreground flex size-4 items-center justify-center"
          onClick={onToggle}
          type="button"
        >
          <ChevronRight className={cn("size-3 transition-transform", isExpanded && "rotate-90")} />
        </button>
      ) : (
        <span className="size-4" />
      )}
      <button
        className="hover:bg-muted flex flex-1 items-center gap-2 rounded px-1.5 py-1 text-left"
        onClick={onSelect}
        type="button"
      >
        <span className="text-muted-foreground">{nodeIcon(node.type)}</span>
        <span data-testid="tree-node-label">{node.title}</span>
      </button>
      {showMultiParent && (
        <span
          aria-label="Multiple parents"
          className="text-muted-foreground"
          data-testid="multi-parent-indicator"
          title="Multiple parents"
        >
          <Link2 className="size-3" />
        </span>
      )}
    </div>
  );
}
