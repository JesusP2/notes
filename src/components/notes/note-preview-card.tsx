import { Badge } from "@/components/ui/badge";
import type { Node } from "@/db/schema/graph";
import { useNoteTags, useNodeById } from "@/lib/graph-hooks";
import { buildNoteExcerpt } from "@/lib/note-excerpt";

function formatUpdatedAt(updatedAt: Node["updatedAt"]) {
  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export function NotePreviewCard({ noteId }: { noteId: string }) {
  const note = useNodeById(noteId);
  const tags = useNoteTags(noteId);

  if (!note) {
    return <div className="text-xs text-muted-foreground">No preview available.</div>;
  }

  const excerpt = note.excerpt ?? buildNoteExcerpt(note.content ?? "");

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="text-sm font-semibold">{note.title}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Updated {formatUpdatedAt(note.updatedAt)}
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-[10px]">
              {tag.title}
            </Badge>
          ))}
        </div>
      )}
      {excerpt && <p className="text-xs text-muted-foreground line-clamp-3">{excerpt}</p>}
    </div>
  );
}
