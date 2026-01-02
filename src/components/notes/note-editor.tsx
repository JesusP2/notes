import type { Extension } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Edit3Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { Node } from "@/db/schema/graph";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { VimModeExtension, type VimModeState } from "./vim-mode";

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: string) => void;
  debounceMs?: number;
  saveNowRef?: MutableRefObject<(() => void) | null>;
  vimEnabled?: boolean;
}

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  extensions: Extension[];
  vimEnabled: boolean;
}

function TipTapEditor({ content, onChange, extensions, vimEnabled }: TipTapEditorProps) {
  const initialContentRef = useRef(content);

  const editor = useEditor({
    extensions,
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

  useEffect(() => {
    if (!editor) return;
    editor.storage.vimMode.enabled = vimEnabled;
    if (vimEnabled) {
      editor.storage.vimMode.mode = "normal";
    } else {
      editor.storage.vimMode.mode = "insert";
    }
  }, [editor, vimEnabled]);

  return (
    <div className="tiptap-wrapper min-h-full" data-testid="tiptap-editor">
      <EditorContent editor={editor} className="min-h-full" />
    </div>
  );
}

export function NoteEditor({
  note,
  onChange,
  debounceMs = 500,
  saveNowRef,
  vimEnabled = false,
}: NoteEditorProps) {
  const [editorKey, setEditorKey] = useState(note?.id ?? "empty");
  const lastTitleRef = useRef<string | null>(null);
  const [vimMode, setVimMode] = useState<VimModeState>("insert");

  if (note?.id && note.id !== editorKey) {
    setEditorKey(note.id);
    lastTitleRef.current = null;
  }

  const { call: debouncedSave, flush: flushSave } = useDebouncedCallback(
    (nextContent: string) => {
      onChange(nextContent);
    },
    debounceMs,
  );

  useEffect(() => {
    if (!saveNowRef) return;
    saveNowRef.current = flushSave;
    return () => {
      saveNowRef.current = null;
    };
  }, [flushSave, saveNowRef]);

  useEffect(() => {
    setVimMode(vimEnabled ? "normal" : "insert");
  }, [vimEnabled]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      debouncedSave(newContent);
    },
    [debouncedSave],
  );

  const extensions = useMemo(() => {
    return [StarterKit, VimModeExtension.configure({ onModeChange: setVimMode })];
  }, [setVimMode]);

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
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto w-full px-8 py-6">
          <TipTapEditor
            key={editorKey}
            content={initialContent}
            onChange={handleContentChange}
            extensions={extensions}
            vimEnabled={vimEnabled}
          />
        </div>
      </div>
      {vimEnabled && (
        <div className="flex items-center justify-between border-t px-4 py-1 text-xs text-muted-foreground">
          <span>Vim mode</span>
          <span className="font-medium uppercase text-foreground">{vimMode}</span>
        </div>
      )}
    </div>
  );
}
