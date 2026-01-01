import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Edit3Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Node } from "@/db/schema/graph";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: string) => void;
  debounceMs?: number;
}

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const initialContentRef = useRef(content);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContentRef.current,
    editorProps: {
      attributes: {
        class: "tiptap-editor prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-full",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className="tiptap-wrapper h-full overflow-auto" data-testid="tiptap-editor">
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
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

  const initialContent = note.content || `<h1>${note.title || "Untitled"}</h1><p></p>`;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-8 py-6 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TipTapEditor
            key={editorKey}
            content={initialContent}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
