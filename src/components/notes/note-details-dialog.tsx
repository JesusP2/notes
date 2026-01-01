import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { LinkDialog } from "@/components/edges/link-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Node } from "@/db/schema/graph";
import { useGraphData, useNodeById, useNodeEdges } from "@/lib/graph-hooks";

const LINK_TYPES = new Set(["references", "supports", "contradicts", "related_to"]);
const LINK_LABELS: Record<string, string> = {
  references: "references",
  supports: "supports",
  contradicts: "contradicts",
  related_to: "related to",
};

interface NoteDetailsDialogProps {
  noteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteDetailsDialog({ noteId, open, onOpenChange }: NoteDetailsDialogProps) {
  const note = useNodeById(noteId ?? "");
  const { outgoing, incoming } = useNodeEdges(noteId ?? "");
  const { nodes } = useGraphData();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const parentEdges = outgoing.filter((edge) => edge.type === "part_of");
  const tagEdges = outgoing.filter((edge) => edge.type === "tagged_with");
  const outgoingLinks = outgoing.filter((edge) => LINK_TYPES.has(edge.type));
  const incomingLinks = incoming.filter((edge) => LINK_TYPES.has(edge.type));

  if (!noteId || !note) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="size-4" />
              {note.title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Button onClick={() => setLinkDialogOpen(true)} size="sm" variant="outline">
              Link to...
            </Button>

            <Section title="Parent Folders" count={parentEdges.length} emptyLabel="No folders yet.">
              {parentEdges.map((edge) => {
                const node = nodesById.get(edge.targetId);
                return (
                  <div key={edge.id} className="flex items-center justify-between text-xs">
                    <span>{node?.title ?? "Unknown folder"}</span>
                    <Badge variant="outline">folder</Badge>
                  </div>
                );
              })}
            </Section>

            <Separator />

            <Section title="Tags" count={tagEdges.length} emptyLabel="No tags yet.">
              {tagEdges.map((edge) => {
                const node = nodesById.get(edge.targetId);
                return (
                  <div key={edge.id} className="flex items-center justify-between text-xs">
                    <span>{node?.title ?? "Unknown tag"}</span>
                    <Badge variant="outline">tag</Badge>
                  </div>
                );
              })}
            </Section>

            <Separator />

            <Section
              title="Outgoing Links"
              count={outgoingLinks.length}
              emptyLabel="No outgoing links."
            >
              {outgoingLinks.map((edge) => {
                const node = nodesById.get(edge.targetId);
                return (
                  <div key={edge.id} className="flex items-center justify-between text-xs">
                    {node?.type === "note" ? (
                      <Link
                        className="hover:underline"
                        to="/notes/$noteId"
                        params={{ noteId: node.id }}
                        onClick={() => onOpenChange(false)}
                      >
                        {node.title}
                      </Link>
                    ) : (
                      <span>{node?.title ?? "Unknown note"}</span>
                    )}
                    <Badge variant="outline">{LINK_LABELS[edge.type] ?? edge.type}</Badge>
                  </div>
                );
              })}
            </Section>

            <Separator />

            <Section title="Backlinks" count={incomingLinks.length} emptyLabel="No backlinks yet.">
              {incomingLinks.map((edge) => {
                const node = nodesById.get(edge.sourceId);
                return (
                  <div key={edge.id} className="flex items-center justify-between text-xs">
                    {node?.type === "note" ? (
                      <Link
                        className="hover:underline"
                        to="/notes/$noteId"
                        params={{ noteId: node.id }}
                        onClick={() => onOpenChange(false)}
                      >
                        {node.title}
                      </Link>
                    ) : (
                      <span>{node?.title ?? "Unknown note"}</span>
                    )}
                    <Badge variant="outline">{LINK_LABELS[edge.type] ?? edge.type}</Badge>
                  </div>
                );
              })}
            </Section>

            <Separator />

            <div className="text-xs text-muted-foreground space-y-1">
              <div>Created: {note.createdAt.toLocaleString()}</div>
              <div>Updated: {note.updatedAt.toLocaleString()}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        sourceId={note.id}
        sourceTitle={note.title}
      />
    </>
  );
}

function Section({
  title,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
        <span>{title}</span>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {count ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      )}
    </section>
  );
}
