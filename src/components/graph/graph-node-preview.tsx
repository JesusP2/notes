import { FileText, Folder, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Node } from "@/db/schema/graph";

interface GraphNodePreviewProps {
  node: Node;
  position: { x: number; y: number };
  onClose: () => void;
  onNavigate: () => void;
}

const NODE_ICONS: Record<Node["type"], typeof FileText> = {
  note: FileText,
  folder: Folder,
  tag: Tag,
};

export function GraphNodePreview({ node, position, onClose, onNavigate }: GraphNodePreviewProps) {
  const Icon = NODE_ICONS[node.type];

  const adjustedX = Math.min(position.x, window.innerWidth - 280);
  const adjustedY = Math.min(position.y, window.innerHeight - 200);

  return (
    <div
      className="fixed z-50 w-64 rounded-lg border bg-popover p-4 shadow-lg"
      style={{ left: adjustedX + 10, top: adjustedY + 10 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">{node.title}</span>
        </div>
        <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {node.type}
        </Badge>
      </div>

      {node.type === "note" && node.content && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-3">
          {node.content.slice(0, 150)}
          {node.content.length > 150 && "..."}
        </p>
      )}

      {node.type === "note" && (
        <Button className="mt-3 w-full" size="sm" onClick={onNavigate}>
          Open Note
        </Button>
      )}
    </div>
  );
}
