import { Link } from "@tanstack/react-router";
import { Info, Plus, Tag, X } from "lucide-react";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { LinkDialog } from "@/components/edges/link-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { Node } from "@/db/schema/graph";
import { useGraphData, useNodeById, useNodeEdges, useNodeMutations, useParentTags, useTags } from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";

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
  const parentTags = useParentTags(noteId ?? "");
  const allTags = useTags();
  const { addParent, removeParent } = useNodeMutations();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [, startTransition] = useTransition();

  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const parentTagIds = new Set(parentTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !parentTagIds.has(t.id) && t.id !== "root");

  const handleAddTag = (tagId: string) => {
    if (!noteId) return;
    startTransition(async () => {
      await addParent(noteId, tagId);
    });
    setTagPopoverOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    if (!noteId || parentTags.length <= 1) return;
    startTransition(async () => {
      await removeParent(noteId, tagId);
    });
  };

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

            <section className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                <span>Parent Tags</span>
                <Badge variant="secondary">{parentTags.length}</Badge>
              </div>
              {parentTags.length > 0 ? (
                <div className="space-y-1">
                  {parentTags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between text-xs group">
                      <span className="flex items-center gap-1.5">
                        <Tag className="size-3 text-muted-foreground" />
                        {tag.title}
                      </span>
                      {parentTags.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 rounded-sm p-0.5 transition-opacity"
                          aria-label={`Remove tag ${tag.title}`}
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No parent tags yet.</p>
              )}
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger
                  render={
                    <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground w-full justify-start" />
                  }
                >
                  <Plus className="size-3" />
                  Add tag
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-1">
                  {availableTags.length === 0 ? (
                    <div className="px-2 py-1.5 text-muted-foreground text-xs">
                      {allTags.length <= 1 ? "No other tags exist yet." : "All tags already added."}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleAddTag(tag.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs",
                            "hover:bg-muted focus:bg-muted outline-none",
                          )}
                        >
                          <Tag className="size-3 text-muted-foreground" />
                          {tag.title}
                        </button>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </section>

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
