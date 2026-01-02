import { usePGlite } from "@electric-sql/pglite-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Edit3Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { LinkDialog } from "@/components/edges/link-dialog";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";
import { NoteDetailsDialog } from "@/components/notes/note-details-dialog";
import { NoteEditor } from "@/components/notes/note-editor";
import { syncEmbeds, syncWikiLinks } from "@/components/notes/wiki-link-plugin";
import { useConfirmDialog } from "@/components/providers/confirm-dialog";
import { useAppSettings } from "@/components/providers/app-settings";
import type { Node } from "@/db/schema/graph";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { useNodeMutations, useVersionMutations } from "@/lib/graph-hooks";
import { buildNoteExcerpt } from "@/lib/note-excerpt";
import { SHORTCUTS } from "@/lib/shortcuts";
import { syncTasks } from "@/lib/tasks";
import { useEditorShortcut } from "@/lib/use-shortcut";

export const Route = createFileRoute("/_/notes/$noteId")({
  component: NoteEditorPage,
});

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const { updateNode, deleteNode } = useNodeMutations();
  const { createNoteVersion } = useVersionMutations();
  const db = usePGlite();
  const [, startTransition] = useTransition();
  const navigate = useNavigate();
  const { openConfirmDialog } = useConfirmDialog();
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const saveNowRef = useRef<(() => void) | null>(null);
  const [note, setNote] = useState<Node | null>(null);
  const [noteLoading, setNoteLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const { vimEnabled } = useAppSettings();
  const userId = useCurrentUserId();

  useEffect(() => {
    let cancelled = false;
    setNoteLoading(true);
    setNote(null);

    const loadNote = async () => {
      if (!noteId) {
        if (!cancelled) {
          setNoteLoading(false);
        }
        return;
      }

      try {
        const result = await db.query<Node>(
          `SELECT
             nodes.id AS id,
             nodes.user_id AS "userId",
             nodes.type AS type,
             nodes.title AS title,
             nodes.content AS content,
             nodes.excerpt AS excerpt,
             nodes.color AS color,
             nodes.created_at AS "createdAt",
             nodes.updated_at AS "updatedAt"
           FROM nodes
           WHERE id = $1 AND user_id = $2
           LIMIT 1`,
          [noteId, userId],
        );

        if (!cancelled) {
          setNote(result.rows[0] ?? null);
        }
      } finally {
        if (!cancelled) {
          setNoteLoading(false);
        }
      }
    };

    void loadNote();

    return () => {
      cancelled = true;
    };
  }, [db, noteId, userId]);

  const handleContentSave = useCallback(
    (content: string) => {
      const excerpt = buildNoteExcerpt(content);
      startTransition(async () => {
        await updateNode(noteId, { content, excerpt, updatedAt: new Date() });
        await syncWikiLinks({ db, noteId, userId, content });
        await syncEmbeds({ db, noteId, userId, content });
        await syncTasks({ db, userId, noteId, content });
        if (note?.title) {
          await createNoteVersion(noteId, note.title, content, "autosave");
        }
      });
    },
    [createNoteVersion, db, note, noteId, updateNode, userId],
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

  const handleVersionRestored = useCallback(
    (content: string, title: string) => {
      setNote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          content,
          title,
          updatedAt: new Date(),
        };
      });
      setEditorKey((prev) => prev + 1);
      startTransition(async () => {
        await syncWikiLinks({ db, noteId, userId, content });
        await syncEmbeds({ db, noteId, userId, content });
        await syncTasks({ db, userId, noteId, content });
      });
    },
    [db, noteId, startTransition, userId],
  );

  useEditorShortcut(SHORTCUTS.NOTE_DETAILS, handleOpenDetails, editorContainerRef, {
    enabled: !!note && !noteLoading,
  });
  useEditorShortcut(SHORTCUTS.LINK_TO, handleOpenLinkDialog, editorContainerRef, {
    enabled: !!note && !noteLoading,
  });
  useEditorShortcut(SHORTCUTS.DELETE_NOTE, handleDelete, editorContainerRef, {
    enabled: !!note && !noteLoading,
  });
  useEditorShortcut(SHORTCUTS.SAVE_NOW, handleSaveNow, editorContainerRef, {
    enabled: !!note && !noteLoading,
  });

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div ref={editorContainerRef} className="flex-1 min-h-0">
          {noteLoading ? (
            <div className="flex h-full flex-col items-center justify-center bg-muted/10 p-8 text-center animate-in fade-in-50">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Edit3Icon className="size-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Loading Note</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Fetching the latest version from your database.
              </p>
            </div>
          ) : (
            <NoteEditor
              note={note}
              onChange={handleContentSave}
              saveNowRef={saveNowRef}
              vimEnabled={vimEnabled}
              editorKey={editorKey}
            />
          )}
        </div>
        {note && <BacklinksPanel noteId={note.id} />}
      </div>
      <NoteDetailsDialog
        noteId={note?.id ?? null}
        open={detailsOpen && !!note}
        onOpenChange={(open) => {
          if (!open) setDetailsOpen(false);
        }}
        onVersionRestored={handleVersionRestored}
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
