import type { JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNodeById,
  useNodeMutations,
  useNoteVersions,
  useVersionMutations,
} from "@/lib/graph-hooks";
import { buildNoteExcerpt } from "@/lib/note-excerpt";

function extractTextFromJson(node: JSONContent): string {
  const parts: string[] = [];

  if (node.text) {
    parts.push(node.text);
  }

  if (node.type === "wikiLink") {
    const title = (node.attrs?.title as string) || "";
    if (title) parts.push(`[[${title}]]`);
  }

  if (node.content) {
    for (const child of node.content) {
      parts.push(extractTextFromJson(child));
    }
  }

  return parts.join("");
}

function contentToLines(content: JSONContent | null): string[] {
  if (!content) return [];
  const text = extractTextFromJson(content);
  return text.split(/\n/).filter(Boolean);
}

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  text: string;
};

function buildLineDiff(current: JSONContent | null, previous: JSONContent): DiffLine[] {
  const currentLines = contentToLines(current);
  const previousLines = contentToLines(previous);
  const max = Math.max(currentLines.length, previousLines.length);
  const lines: DiffLine[] = [];

  for (let i = 0; i < max; i += 1) {
    const currentLine = currentLines[i] ?? "";
    const previousLine = previousLines[i] ?? "";

    if (currentLine === previousLine) {
      if (currentLine) {
        lines.push({ type: "unchanged", text: currentLine });
      }
      continue;
    }

    if (previousLine) {
      lines.push({ type: "removed", text: previousLine });
    }
    if (currentLine) {
      lines.push({ type: "added", text: currentLine });
    }
  }

  return lines;
}

function formatTimestamp(value: Date) {
  return value.toLocaleString();
}

interface NoteVersionHistoryDialogProps {
  noteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored?: (content: JSONContent, title: string) => void;
}

export function NoteVersionHistoryDialog({
  noteId,
  open,
  onOpenChange,
  onRestored,
}: NoteVersionHistoryDialogProps) {
  const note = useNodeById(noteId ?? "");
  const versions = useNoteVersions(noteId ?? "");
  const { updateNode } = useNodeMutations();
  const { createNoteVersion } = useVersionMutations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (versions.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => prev ?? versions[0]?.id ?? null);
  }, [open, versions]);

  const selected = useMemo(
    () => versions.find((version) => version.id === selectedId) ?? null,
    [selectedId, versions],
  );

  const diffLines = useMemo(() => {
    if (!note || !selected) return [];
    return buildLineDiff(note.content, selected.content);
  }, [note, selected]);

  const handleRestore = useCallback(async () => {
    if (!note || !selected) return;
    const excerpt = buildNoteExcerpt(selected.content);
    await updateNode(note.id, {
      title: selected.title,
      content: selected.content,
      excerpt,
      updatedAt: new Date(),
    });
    await createNoteVersion(note.id, selected.title, selected.content, "restore");
    onRestored?.(selected.content, selected.title);
    onOpenChange(false);
  }, [createNoteVersion, note, onOpenChange, onRestored, selected, updateNode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>
        {versions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No versions saved yet.</div>
        ) : (
          <div className="grid grid-cols-[220px_1fr] gap-4">
            <ScrollArea className="h-[60vh] pr-2">
              <div className="space-y-2">
                {versions.map((version) => {
                  const isSelected = version.id === selectedId;
                  return (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => setSelectedId(version.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                        isSelected ? "border-primary bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      <div className="font-semibold">{version.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatTimestamp(version.createdAt)}
                      </div>
                      {version.reason && (
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {version.reason}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Diff preview</div>
                <Button size="sm" onClick={handleRestore} disabled={!selected}>
                  Restore Version
                </Button>
              </div>
              <ScrollArea className="h-[60vh] rounded-md border">
                <pre className="whitespace-pre-wrap text-xs p-3">
                  {diffLines.map((line, index) => (
                    <div
                      key={`${line.type}-${index}`}
                      className={
                        line.type === "added"
                          ? "text-emerald-600"
                          : line.type === "removed"
                            ? "text-rose-600"
                            : "text-muted-foreground"
                      }
                    >
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                      {line.text}
                    </div>
                  ))}
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
