import { useEffect, useMemo, useState } from "react";
import type { Node } from "@/db/schema/graph";
import { StreamdownRenderer } from "@/components/streamdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { extractWikiLinks, renderWikiLinks } from "./wiki-link-plugin";

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: string) => void;
  onTitleChange?: (title: string) => void;
  onLinksChange?: (links: string[]) => void;
  linkTargets?: Record<string, string>;
  debounceMs?: number;
}

export function NoteEditor({
  note,
  onChange,
  onTitleChange,
  onLinksChange,
  linkTargets,
  debounceMs = 500,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
  }, [note?.id, note?.title, note?.content]);

  const debouncedSave = useDebouncedCallback((nextContent: string) => {
    onChange(nextContent);
    if (onLinksChange) {
      onLinksChange(extractWikiLinks(nextContent));
    }
  }, debounceMs);

  const preview = useMemo(
    () => renderWikiLinks(content, linkTargets),
    [content, linkTargets],
  );

  if (!note) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Select a note to start editing.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="space-y-1">
        <Label htmlFor="note-title">Title</Label>
        <Input
          aria-label="Title"
          id="note-title"
          onChange={(event) => {
            const value = event.target.value;
            setTitle(value);
            onTitleChange?.(value);
          }}
          placeholder="Untitled note"
          value={title}
        />
      </div>
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="note-content">Content</Label>
          <Textarea
            aria-label="Content"
            className="min-h-[320px] flex-1 font-mono"
            id="note-content"
            onChange={(event) => {
              const value = event.target.value;
              setContent(value);
              debouncedSave(value);
            }}
            placeholder="Write your note in Markdown..."
            value={content}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Preview</Label>
          <div className="bg-muted/20 flex-1 overflow-auto rounded-md border p-3 text-sm">
            {content.trim() ? (
              <StreamdownRenderer>{preview}</StreamdownRenderer>
            ) : (
              <p className="text-muted-foreground italic">
                Preview will appear here...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
