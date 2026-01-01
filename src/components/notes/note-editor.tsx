import { defaultValueCtx, Editor, rootCtx } from "@milkdown/core";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import { Edit3Icon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { NoteTags } from "@/components/notes/note-tags";
import type { Node } from "@/db/schema/graph";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: string) => void;
  debounceMs?: number;
}

function MilkdownEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const initialContentRef = useRef(content);

  useEditor(
    (root) => {
      return Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, initialContentRef.current);
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            onChange(markdown);
          });
        })
        .config(nord)
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener);
    },
    [onChange],
  );

  return <Milkdown />;
}

export function NoteEditor({ note, onChange, debounceMs = 500 }: NoteEditorProps) {
  const [editorKey, setEditorKey] = useState(note?.id ?? "empty");
  const lastTitleRef = useRef<string | null>(null);

  if (note?.id && note.id !== editorKey) {
    setEditorKey(note.id);
    lastTitleRef.current = null;
  }

  const debouncedSave = useDebouncedCallback((nextContent: string) => {
    onChange(nextContent);
  }, debounceMs);

  const handleContentChange = useCallback(
    (newContent: string) => {
      debouncedSave(newContent);
    },
    [debouncedSave],
  );

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

  const initialContent = note.content || `# ${note.title || "Untitled"}\n\n`;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-8 py-6 overflow-hidden">
        <div className="mb-4">
          <NoteTags noteId={note.id} />
        </div>
        <div className="flex-1 overflow-auto prose prose-neutral dark:prose-invert max-w-none">
          <MilkdownProvider key={editorKey}>
            <MilkdownEditor content={initialContent} onChange={handleContentChange} />
          </MilkdownProvider>
        </div>
      </div>
    </div>
  );
}
