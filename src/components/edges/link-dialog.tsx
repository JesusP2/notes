import { useEffect, useState } from "react";
import type { EdgeType, Node } from "@/db/schema/graph";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEdgeMutations } from "@/lib/graph-hooks";
import { EdgeTypeSelect } from "./edge-type-select";
import { NodeSearch } from "./node-search";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceTitle?: string;
}

export function LinkDialog({ open, onOpenChange, sourceId, sourceTitle }: LinkDialogProps) {
  const { createEdge } = useEdgeMutations();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [edgeType, setEdgeType] = useState<EdgeType>("references");

  useEffect(() => {
    if (!open) {
      setSelectedNode(null);
      setEdgeType("references");
    }
  }, [open]);

  const handleCreate = async () => {
    if (!selectedNode) {
      return;
    }
    await createEdge(sourceId, selectedNode.id, edgeType);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to another note</DialogTitle>
          <DialogDescription>
            {sourceTitle ? `From "${sourceTitle}".` : "Choose a note to link."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <NodeSearch
            excludeId={sourceId}
            onSelect={(node) => setSelectedNode(node)}
            selectedId={selectedNode?.id}
          />
          <EdgeTypeSelect value={edgeType} onValueChange={setEdgeType} />
          {selectedNode ? (
            <p className="text-muted-foreground text-xs">
              Linking to <span className="font-medium text-foreground">{selectedNode.title}</span>.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">No target selected yet.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!selectedNode}>
            Create Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
