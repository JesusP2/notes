import { usePGlite } from "@electric-sql/pglite-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { LinkDialog } from "@/components/edges/link-dialog";
import { NoteDetailsDialog } from "@/components/notes/note-details-dialog";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteToolbar } from "@/components/notes/note-toolbar";
import { syncWikiLinks } from "@/components/notes/wiki-link-plugin";
import { useConfirmDialog } from "@/components/providers/confirm-dialog";
import { useNodeById, useNodeMutations } from "@/lib/graph-hooks";
import { SHORTCUTS } from "@/lib/shortcuts";
import { useEditorShortcut } from "@/lib/use-shortcut";

export const Route = createFileRoute("/_/notes/$noteId")({
  component: NoteEditorPage,
});

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const note = useNodeById(noteId);
  const { updateNode, deleteNode } = useNodeMutations();
  const db = usePGlite();
  const [, startTransition] = useTransition();
  const navigate = useNavigate();
  const { openConfirmDialog } = useConfirmDialog();
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const saveNowRef = useRef<(() => void) | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [vimEnabled, setVimEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("vim-mode") === "true";
  });

  const handleContentSave = useCallback(
    (content: string) => {
      startTransition(async () => {
        await updateNode(noteId, { content, updatedAt: new Date() });
        await syncWikiLinks({ db, noteId, content });
      });
    },
    [db, noteId, updateNode],
  );

  const handleOpenDetails = useCallback(() => {
    setDetailsOpen(true);
  }, []);

  const handleOpenLinkDialog = useCallback(() => {
    setLinkDialogOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!note) return;
    openConfirmDialog({
      title: "Delete note?",
      description: `Are you sure you want to delete "${note.title}"? This cannot be undone.`,
      handleConfirm: () => {
        startTransition(async () => {
          await deleteNode(note.id);
          navigate({ to: "/" });
        });
      },
      variant: "destructive",
    });
  }, [note, openConfirmDialog, deleteNode, navigate, startTransition]);

  const handleSaveNow = useCallback(() => {
    saveNowRef.current?.();
  }, []);

  useEditorShortcut(
    SHORTCUTS.NOTE_DETAILS,
    handleOpenDetails,
    editorContainerRef,
    {
      enabled: !!note,
    },
  );
  useEditorShortcut(
    SHORTCUTS.LINK_TO,
    handleOpenLinkDialog,
    editorContainerRef,
    {
      enabled: !!note,
    },
  );
  useEditorShortcut(SHORTCUTS.DELETE_NOTE, handleDelete, editorContainerRef, {
    enabled: !!note,
  });
  useEditorShortcut(SHORTCUTS.SAVE_NOW, handleSaveNow, editorContainerRef, {
    enabled: !!note,
  });

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <NoteToolbar
          note={note}
          onOpenDetails={handleOpenDetails}
          onLinkTo={handleOpenLinkDialog}
          onDelete={handleDelete}
          vimEnabled={vimEnabled}
          onToggleVim={() => {
            setVimEnabled((prev) => {
              const next = !prev;
              localStorage.setItem("vim-mode", String(next));
              return next;
            });
          }}
        />
        <div ref={editorContainerRef} className="flex-1 min-h-0">
          <NoteEditor
            note={note}
            onChange={handleContentSave}
            saveNowRef={saveNowRef}
            vimEnabled={vimEnabled}
          />
        </div>
      </div>
      <NoteDetailsDialog
        noteId={note?.id ?? null}
        open={detailsOpen && !!note}
        onOpenChange={(open) => {
          if (!open) setDetailsOpen(false);
        }}
      />
      {note && (
        <LinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          sourceId={note.id}
          sourceTitle={note.title}
        />
      )}
    </>
  );
}
