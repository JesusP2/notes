import { history } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, drawSelection } from "@codemirror/view";
import { getCM, vim } from "@replit/codemirror-vim";
import { tags } from "@lezer/highlight";
import { Edit3Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { Node } from "@/db/schema/graph";
import { useDebouncedCallback } from "@/hooks/use-debounce";

type VimModeState = "insert" | "normal" | "visual" | "visual block" | "replace";

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: string) => void;
  debounceMs?: number;
  saveNowRef?: MutableRefObject<(() => void) | null>;
  vimEnabled?: boolean;
}

interface CodeMirrorEditorProps {
  content: string;
  onChange: (content: string) => void;
  vimEnabled: boolean;
  onModeChange: (mode: VimModeState) => void;
}

const VIM_MODE_DEFAULT: VimModeState = "insert";

const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.8em", fontWeight: "700", lineHeight: "1.3" },
  { tag: tags.heading2, fontSize: "1.5em", fontWeight: "700", lineHeight: "1.35" },
  { tag: tags.heading3, fontSize: "1.25em", fontWeight: "600", lineHeight: "1.4" },
  { tag: tags.heading4, fontSize: "1.1em", fontWeight: "600", lineHeight: "1.45" },
  { tag: tags.heading5, fontSize: "1em", fontWeight: "600", lineHeight: "1.5" },
  { tag: tags.heading6, fontSize: "1em", fontWeight: "600", lineHeight: "1.5" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, textDecoration: "underline" },
  { tag: tags.url, textDecoration: "underline" },
  { tag: tags.quote, fontStyle: "italic", color: "var(--muted-foreground)" },
  { tag: tags.monospace, fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" },
  { tag: tags.processingInstruction, opacity: "0.45" },
]);

function normalizeVimMode(mode?: string | null): VimModeState {
  if (!mode) return VIM_MODE_DEFAULT;
  const normalized = mode.toLowerCase();
  if (normalized.startsWith("visual")) {
    return normalized.includes("block") ? "visual block" : "visual";
  }
  if (normalized === "insert" || normalized === "normal" || normalized === "replace") {
    return normalized;
  }
  return VIM_MODE_DEFAULT;
}

function isLikelyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function stripHtml(value: string) {
  if (typeof window !== "undefined" && "DOMParser" in window) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const text = doc.body.innerText ?? doc.body.textContent ?? "";
    return text.trim();
  }

  return value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/?\s*(p|div|h[1-6]|li|ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getInitialContent(note: Node) {
  if (!note.content) {
    return `# ${note.title || "Untitled"}\n\n`;
  }

  if (isLikelyHtml(note.content)) {
    const stripped = stripHtml(note.content);
    return stripped || `# ${note.title || "Untitled"}\n\n`;
  }

  return note.content;
}

function CodeMirrorEditor({ content, onChange, vimEnabled, onModeChange }: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onModeChangeRef = useRef(onModeChange);
  const initialContentRef = useRef(content);
  const initialVimEnabledRef = useRef(vimEnabled);
  const vimCompartment = useRef(new Compartment());
  const detachVimListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onModeChangeRef.current = onModeChange;
  }, [onModeChange]);

  const baseExtensions = useMemo(
    () => [
      EditorView.lineWrapping,
      drawSelection(),
      EditorView.theme({
        "&": { height: "100%" },
        ".cm-scroller": { fontFamily: "inherit" },
        ".cm-content": { lineHeight: "1.6", fontSize: "1rem" },
      }),
      syntaxHighlighting(markdownHighlightStyle),
      history(),
      markdown(),
    ],
    [],
  );

  const attachVimListener = useCallback(() => {
    const view = viewRef.current;
    if (!view) return false;
    const cm = getCM(view);
    if (!cm) return false;

    const handleModeChange = () => {
      onModeChangeRef.current(normalizeVimMode(cm.state.vim?.mode));
    };

    cm.on("vim-mode-change", handleModeChange);
    detachVimListenerRef.current = () => {
      cm.off("vim-mode-change", handleModeChange);
    };
    handleModeChange();
    return true;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      onChangeRef.current(update.state.doc.toString());
    });

    const state = EditorState.create({
      doc: initialContentRef.current,
      extensions: [
        ...baseExtensions,
        updateListener,
        vimCompartment.current.of(initialVimEnabledRef.current ? vim({ status: false }) : []),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    if (initialVimEnabledRef.current) {
      attachVimListener();
    } else {
      onModeChangeRef.current("insert");
    }

    return () => {
      detachVimListenerRef.current?.();
      view.destroy();
    };
  }, [baseExtensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    detachVimListenerRef.current?.();
    detachVimListenerRef.current = null;

    view.dispatch({
      effects: vimCompartment.current.reconfigure(vimEnabled ? vim({ status: false }) : []),
    });

    if (!vimEnabled) {
      onModeChangeRef.current("insert");
      return;
    }

    if (!attachVimListener()) {
      queueMicrotask(() => {
        attachVimListener();
      });
    }
  }, [vimEnabled]);

  return <div ref={containerRef} className="note-editor-wrapper min-h-full" data-testid="note-editor" />;
}

export function NoteEditor({
  note,
  onChange,
  debounceMs = 500,
  saveNowRef,
  vimEnabled = false,
}: NoteEditorProps) {
  const [vimMode, setVimMode] = useState<VimModeState>(VIM_MODE_DEFAULT);

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

  const handleContentChange = useCallback(
    (newContent: string) => {
      debouncedSave(newContent);
    },
    [debouncedSave],
  );

  useEffect(() => {
    return () => {
      flushSave();
    };
  }, [flushSave, note?.id]);

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

  const initialContent = getInitialContent(note);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto w-full px-8 py-6">
          <CodeMirrorEditor
            key={note.id}
            content={initialContent}
            onChange={handleContentChange}
            vimEnabled={vimEnabled}
            onModeChange={setVimMode}
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
