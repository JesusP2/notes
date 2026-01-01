import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from "@codemirror/view";
import { vim } from "@replit/codemirror-vim";
import { Edit3Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Node } from "@/db/schema/graph";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { useTheme } from "next-themes";
import { createAppTheme } from "./codemirror-theme";

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: string) => void;
  debounceMs?: number;
}

const themeCompartment = new Compartment();

interface CodeMirrorEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function CodeMirrorEditor({ content, onChange }: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const initialContentRef = useRef(content);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = resolvedTheme === "dark";

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: initialContentRef.current,
      extensions: [
        vim(),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        themeCompartment.of(createAppTheme(isDark)),
        EditorView.lineWrapping,
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    editorRef.current = view;

    return () => {
      view.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const isDark = resolvedTheme === "dark";
    editorRef.current.dispatch({
      effects: themeCompartment.reconfigure(createAppTheme(isDark)),
    });
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="codemirror-wrapper h-full overflow-auto"
      data-testid="codemirror-editor"
    />
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

  const initialContent = note.content || `# ${note.title || "Untitled"}\n\n`;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-8 py-6 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <CodeMirrorEditor
            key={editorKey}
            content={initialContent}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
