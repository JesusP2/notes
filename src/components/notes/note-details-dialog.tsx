import { Link } from "@tanstack/react-router";
import { Download, History, Info, Plus, Printer, Tag, X } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState, useTransition } from "react";
import { LinkDialog } from "@/components/edges/link-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { Node } from "@/db/schema/graph";
import { ROOT_TAG_ID } from "@/hooks/use-current-user";
import { exportAsMarkdown, exportAsPdf } from "@/lib/export-note";
import {
  useGraphData,
  useNodeById,
  useNodeEdges,
  useNodeMutations,
  useNoteTags,
  useTags,
} from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";
import { NoteVersionHistoryDialog } from "./note-version-history-dialog";

const LINK_TYPES = new Set([
  "references",
  "supports",
  "contradicts",
  "related_to",
  "embeds",
  "derived_from",
]);
const LINK_LABELS: Record<string, string> = {
  references: "references",
  supports: "supports",
  contradicts: "contradicts",
  related_to: "related to",
  embeds: "embeds",
  derived_from: "derived from",
};

interface NoteDetailsDialogProps {
  noteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionRestored?: (content: string, title: string) => void;
}

export function NoteDetailsDialog({
  noteId,
  open,
  onOpenChange,
  onVersionRestored,
}: NoteDetailsDialogProps) {
  const note = useNodeById(noteId ?? "");
  const { outgoing, incoming } = useNodeEdges(noteId ?? "");
  const { nodes } = useGraphData();
  const noteTags = useNoteTags(noteId ?? "");
  const allTags = useTags();
  const { addTag, removeTag } = useNodeMutations();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [, startTransition] = useTransition();

  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const noteTagIds = new Set(noteTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !noteTagIds.has(t.id) && t.id !== ROOT_TAG_ID);

  const handleAddTag = (tagId: string) => {
    if (!noteId) return;
    startTransition(async () => {
      await addTag(noteId, tagId);
    });
    setTagPopoverOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    if (!noteId) return;
    startTransition(async () => {
      await removeTag(noteId, tagId);
    });
  };

  const outgoingLinks = outgoing.filter((edge) => LINK_TYPES.has(edge.type));
  const incomingLinks = incoming.filter((edge) => LINK_TYPES.has(edge.type));

  const handleExportMarkdown = useCallback(() => {
    if (!note) return;
    exportAsMarkdown(note.title, note.content ?? "");
  }, [note]);

  const handleExportPdf = useCallback(() => {
    if (!note) return;
    exportAsPdf(note.title, note.content ?? "");
  }, [note]);

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
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setLinkDialogOpen(true)} size="sm" variant="outline">
                Link to...
              </Button>
              <Button onClick={() => setHistoryOpen(true)} size="sm" variant="outline">
                <History className="size-4 mr-1" />
                History
              </Button>
              <Button onClick={handleExportMarkdown} size="sm" variant="outline">
                <Download className="size-4 mr-1" />
                Markdown
              </Button>
              <Button onClick={handleExportPdf} size="sm" variant="outline">
                <Printer className="size-4 mr-1" />
                PDF
              </Button>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                <span>Tags</span>
                <Badge variant="secondary">{noteTags.length}</Badge>
              </div>
              {noteTags.length > 0 ? (
                <div className="space-y-1">
                  {noteTags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between text-xs group">
                      <span className="flex items-center gap-1.5">
                        <Tag className="size-3 text-muted-foreground" />
                        {tag.title}
                      </span>
                      {noteTags.length > 0 && (
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
                <p className="text-muted-foreground text-xs">No tags yet.</p>
              )}
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-muted-foreground w-full justify-start"
                    />
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
      <NoteVersionHistoryDialog
        noteId={noteId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onRestored={onVersionRestored}
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
