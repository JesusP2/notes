import { Edit3Icon } from "lucide-react";
import { useEffect, type RefObject } from "react";
import { EditorContent, EditorContext, useEditor, type JSONContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { LocalImage } from "@/components/tiptap-node/image-node/local-image-extension";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import type { Node } from "@/db/schema/graph";
import { ROOT_TAG_ID, useCurrentUserId } from "@/hooks/use-current-user";
import { useGraphData, useNodeMutations } from "@/lib/graph-hooks";
import { createImageUploadHandler, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { useAppSettings } from "@/components/providers/app-settings";

import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { WikiLinkNode } from "@/components/tiptap-extension/wiki-link-node";
import { createWikiLinkSuggestion } from "@/components/tiptap-extension/wiki-link-suggestion";
import { CalloutNode } from "@/components/tiptap-node/callout-node/callout-node-extension";
import { BlockEscape } from "@/components/tiptap-extension/block-escape";
import "@/components/tiptap-node/callout-node/callout-node.scss";
import { tableExtensions } from "@/components/tiptap-node/table-node";
import { TableMenu } from "@/components/tiptap-ui/table-menu/table-menu";
import { MathNode } from "@/components/tiptap-node/math-node/math-node-extension";
import "@/components/tiptap-node/math-node/math-node.scss";
import { MermaidNode } from "@/components/tiptap-node/mermaid-node/mermaid-node-extension";
import "@/components/tiptap-node/mermaid-node/mermaid-node.scss";
import { SlashCommandNode } from "@/components/tiptap-node/slash-command-node/slash-command-node-extension";
import { createSlashCommandSuggestion } from "@/components/tiptap-extension/slash-command-suggestion";

import { SelectionMenu } from "@/components/tiptap-ui/selection-menu";
import { useDebouncer } from "@tanstack/react-pacer";

import "@/styles/_variables.scss";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "@/components/tiptap-node/table-node/table-node.scss";
import "@/components/tiptap-templates/simple/simple-editor.scss";

export type EditorMaxWidth =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "full";

const MAX_WIDTH_VALUES: Record<EditorMaxWidth, string> = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
  "3xl": "1792px",
  "4xl": "2048px",
  "5xl": "2304px",
  "6xl": "2560px",
  "7xl": "2816px",
  full: "100%",
};

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: JSONContent) => void;
  debounceMs?: number;
  saveNowRef?: RefObject<(() => void) | null>;
  editorKey?: number;
  maxWidth?: EditorMaxWidth;
}

function getInitialContent(note: Node): JSONContent {
  if (note.content) {
    return note.content as JSONContent;
  }
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: note.title || "Untitled" }] },
      { type: "paragraph" },
    ],
  };
}

export function NoteEditor({
  note,
  onChange,
  debounceMs = 500,
  saveNowRef,
  editorKey = 0,
  maxWidth: maxWidthOverride,
}: NoteEditorProps) {
  const userId = useCurrentUserId();
  const { nodes } = useGraphData();
  const { createNote } = useNodeMutations();
  const { editorMaxWidth } = useAppSettings();

  const maxWidth = maxWidthOverride ?? editorMaxWidth;

  const handleImageUpload = createImageUploadHandler(userId);

  const debouncer = useDebouncer(onChange, {
    wait: debounceMs,
  });

  const handleCreateNote = async (title: string) => {
    return createNote(title, ROOT_TAG_ID);
  };

  const editor = useEditor(
    {
      immediatelyRender: false,
      editorProps: {
        attributes: {
          autocomplete: "off",
          autocorrect: "off",
          autocapitalize: "off",
          class: "simple-editor",
        },
      },
      extensions: [
        StarterKit.configure({
          horizontalRule: false,
          link: {
            openOnClick: false,
            enableClickSelection: true,
          },
        }),
        HorizontalRule,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Highlight.configure({ multicolor: true }),
        LocalImage,
        Typography,
        Superscript,
        Subscript,
        Selection,
        ImageUploadNode.configure({
          accept: "image/*",
          maxSize: MAX_FILE_SIZE,
          limit: 3,
          upload: handleImageUpload,
          onError: (error) => console.error("Upload failed:", error),
        }),
        WikiLinkNode.configure({
          suggestion: createWikiLinkSuggestion({
            getNotes: () => nodes,
            onCreateNote: handleCreateNote,
          }),
        }),
        CalloutNode,
        BlockEscape,
        ...tableExtensions,
        MathNode,
        MermaidNode,
        SlashCommandNode.configure({
          suggestion: createSlashCommandSuggestion(),
        }),
      ],
      content: note ? getInitialContent(note) : "",
      onUpdate: ({ editor }) => {
        debouncer.maybeExecute(editor.getJSON());
      },
    },
    [note?.id, editorKey],
  );

  useEffect(() => {
    if (!saveNowRef) return;
    saveNowRef.current = debouncer.flush;
    return () => {
      saveNowRef.current = null;
    };
  }, [debouncer.flush, saveNowRef]);

  useEffect(() => {
    return () => debouncer.flush();
  }, [note?.id]);

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
    <div className="simple-editor-wrapper" data-testid="note-editor">
      <EditorContext.Provider value={{ editor }}>
        <div
          className="simple-editor-content-wrapper"
          style={{ maxWidth: MAX_WIDTH_VALUES[maxWidth] }}
        >
          <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
          {editor && <TableMenu editor={editor} />}
          {editor && <SelectionMenu editor={editor} />}
        </div>
      </EditorContext.Provider>
    </div>
  );
}
