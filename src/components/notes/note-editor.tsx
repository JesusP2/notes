import { Edit3Icon } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import type { Node } from "@/db/schema/graph";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { ROOT_TAG_ID } from "@/hooks/use-current-user";
import { useGraphData, useNodeMutations } from "@/lib/graph-hooks";
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import { Toolbar, ToolbarGroup, ToolbarSeparator } from "@/components/tiptap-ui-primitive/toolbar";

import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { WikiLinkNode } from "@/components/tiptap-extension/wiki-link-node";
import { createWikiLinkSuggestion } from "@/components/tiptap-extension/wiki-link-suggestion";
import { CalloutNode } from "@/components/tiptap-node/callout-node/callout-node-extension";
import "@/components/tiptap-node/callout-node/callout-node.scss";
import { tableExtensions } from "@/components/tiptap-node/table-node";
import { TableMenu } from "@/components/tiptap-ui/table-menu/table-menu";
import { MathNode } from "@/components/tiptap-node/math-node/math-node-extension";
import "@/components/tiptap-node/math-node/math-node.scss";
import { MermaidNode } from "@/components/tiptap-node/mermaid-node/mermaid-node-extension";
import "@/components/tiptap-node/mermaid-node/mermaid-node.scss";
import { SlashCommandNode } from "@/components/tiptap-node/slash-command-node/slash-command-node-extension";
import { createSlashCommandSuggestion } from "@/components/tiptap-extension/slash-command-suggestion";

import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import { LinkPopover, LinkContent, LinkButton } from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";

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

interface NoteEditorProps {
  note: Node | null;
  onChange: (content: string) => void;
  debounceMs?: number;
  saveNowRef?: MutableRefObject<(() => void) | null>;
  editorKey?: number;
}

function getInitialContent(note: Node): string {
  if (note.content) {
    return note.content;
  }
  return `<h1>${note.title || "Untitled"}</h1><p></p>`;
}

function MainToolbarContent({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} portal={isMobile} />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />
    </>
  );
}

function MobileToolbarContent({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) {
  return (
    <>
      <ToolbarGroup>
        <Button data-style="ghost" onClick={onBack}>
          <ArrowLeftIcon className="tiptap-button-icon" />
          {type === "highlighter" ? (
            <HighlighterIcon className="tiptap-button-icon" />
          ) : (
            <LinkIcon className="tiptap-button-icon" />
          )}
        </Button>
      </ToolbarGroup>

      <ToolbarSeparator />

      {type === "highlighter" ? <ColorHighlightPopoverContent /> : <LinkContent />}
    </>
  );
}

export function NoteEditor({
  note,
  onChange,
  debounceMs = 500,
  saveNowRef,
  editorKey = 0,
}: NoteEditorProps) {
  const { nodes } = useGraphData();
  const { createNote } = useNodeMutations();
  const notesRef = useRef(nodes);
  const onChangeRef = useRef(onChange);
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">("main");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    notesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { call: debouncedSave, flush: flushSave } = useDebouncedCallback((html: string) => {
    onChangeRef.current(html);
  }, debounceMs);

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
        Image,
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
            getNotes: () => notesRef.current,
            onCreateNote: handleCreateNote,
          }),
        }),
        CalloutNode,
        ...tableExtensions,
        MathNode,
        MermaidNode,
        SlashCommandNode.configure({
          suggestion: createSlashCommandSuggestion(),
        }),
      ],
      content: note ? getInitialContent(note) : "",
      onUpdate: ({ editor }) => {
        debouncedSave(editor.getHTML());
      },
    },
    [note?.id, editorKey],
  );

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  useEffect(() => {
    if (!saveNowRef) return;
    saveNowRef.current = flushSave;
    return () => {
      saveNowRef.current = null;
    };
  }, [flushSave, saveNowRef]);

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

  return (
    <div className="simple-editor-wrapper" data-testid="note-editor">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <div className="simple-editor-content-wrapper">
          <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
          {editor && <TableMenu editor={editor} />}
        </div>
      </EditorContext.Provider>
    </div>
  );
}
