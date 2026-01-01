import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Edge, Node } from "@/db/schema/graph";
import { LinkDialog } from "@/components/edges/link-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const LINK_TYPES = new Set(["references", "supports", "contradicts", "related_to"]);
const LINK_LABELS: Record<string, string> = {
  references: "references",
  supports: "supports",
  contradicts: "contradicts",
  related_to: "related to",
};

interface NoteSidebarProps {
  note: Node | null;
  outgoingEdges: Edge[];
  incomingEdges: Edge[];
  nodes: Node[];
}

export function NoteSidebar({ note, outgoingEdges, incomingEdges, nodes }: NoteSidebarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const parentEdges = outgoingEdges.filter((edge) => edge.type === "part_of");
  const tagEdges = outgoingEdges.filter((edge) => edge.type === "tagged_with");
  const outgoingLinks = outgoingEdges.filter((edge) => LINK_TYPES.has(edge.type));
  const incomingLinks = incomingEdges.filter((edge) => LINK_TYPES.has(edge.type));

  if (!note) {
    return (
      <aside className="bg-muted/10 text-muted-foreground w-72 shrink-0 border-l">
        <div className="flex h-full items-center justify-center p-4 text-xs">
          No note selected.
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-muted/10 w-72 shrink-0 border-l">
      <div className="flex h-full flex-col gap-4 overflow-auto p-4">
        <Button onClick={() => setLinkDialogOpen(true)} size="sm" variant="outline">
          Link to...
        </Button>
        <LinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          sourceId={note.id}
          sourceTitle={note.title}
        />
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
                  <Link className="hover:underline" to="/_/notes/$noteId" params={{ noteId: node.id }}>
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
                  <Link className="hover:underline" to="/_/notes/$noteId" params={{ noteId: node.id }}>
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
      </div>
    </aside>
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
      {count ? <div className="space-y-2">{children}</div> : <p className="text-muted-foreground text-xs">{emptyLabel}</p>}
    </section>
  );
}
