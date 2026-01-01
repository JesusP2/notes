import { Edit3Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Node } from "@/db/schema/graph";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { extractWikiLinks } from "./wiki-link-plugin";

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
  debounceMs = 500,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedSave(newContent);
  };

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/10 p-8 text-center animate-in fade-in-50">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Edit3Icon className="size-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No Note Selected</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Select a note from the sidebar or create a new one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-8 py-6">
        <Input
          value={title}
          onChange={(e) => {
            const val = e.target.value;
            setTitle(val);
            onTitleChange?.(val);
          }}
          className="text-2xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50 mb-4"
          placeholder="Untitled Note"
        />
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="flex-1 w-full resize-none border-none focus-visible:ring-0 px-0 text-base leading-relaxed bg-transparent"
          placeholder="Start writing..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
