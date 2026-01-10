import { and, eq } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { useDebouncer } from "@tanstack/react-pacer";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/core";
import { Edit3Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LinkDialog } from "@/components/edges/link-dialog";
import { BacklinksPanel } from "@/components/notes/backlinks-panel";
import { NoteDetailsDialog } from "@/components/notes/note-details-dialog";
import { NoteEditor } from "@/components/notes/note-editor";
import { syncEmbeds, syncWikiLinks } from "@/components/notes/wiki-link-plugin";
import { useConfirmDialog } from "@/components/providers/confirm-dialog";

import { useCurrentUserId } from "@/hooks/use-current-user";
import { nodesCollection } from "@/lib/collections";
import { useNodeMutations, useVersionMutations } from "@/lib/graph-hooks";
import { buildNoteExcerpt } from "@/lib/note-excerpt";
import { useIndexOnSave } from "@/lib/semantic-search/use-index-on-save";
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
  const { scheduleIndex } = useIndexOnSave();
  const navigate = useNavigate();
  const { openConfirmDialog } = useConfirmDialog();
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const saveNowRef = useRef<(() => void) | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const userId = useCurrentUserId();

  const noteQuery = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .where(({ nodes }) => and(eq(nodes.id, noteId), eq(nodes.userId, userId))),
    [noteId, userId],
  );
  const note = noteQuery.data?.[0] ?? null;
  const noteLoading = Boolean(noteId) && noteQuery.isLoading;

  // Store latest note title in a ref for use in callbacks
  const noteTitleRef = useRef(note?.title);
  useEffect(() => {
    noteTitleRef.current = note?.title;
  }, [note?.title]);

  // Expensive background operations with longer debounce (2 seconds)
  const runBackgroundSync = useCallback(
    (content: JSONContent) => {
      syncWikiLinks({ noteId, userId, content });
      syncEmbeds({ noteId, userId, content });
      syncTasks({ userId, noteId, content });
      const title = noteTitleRef.current;
      if (title) {
        createNoteVersion(noteId, title, content, "autosave");
        scheduleIndex(noteId, userId, title, content);
      }
    },
    [noteId, userId, createNoteVersion, scheduleIndex],
  );

  const backgroundSyncDebouncer = useDebouncer(runBackgroundSync, {
    wait: 2000,
  });

  // Flush background sync when navigating away
  useEffect(() => {
    return () => backgroundSyncDebouncer.flush();
  }, [noteId]);

  const handleContentSave = useCallback(
    (content: JSONContent) => {
      // Immediate: save content to database
      const excerpt = buildNoteExcerpt(content);
      updateNode(noteId, { content, excerpt, updatedAt: new Date() });

      // Debounced: expensive background operations (wiki links, embeds, tasks, versioning, indexing)
      backgroundSyncDebouncer.maybeExecute(content);
    },
    [noteId, updateNode, backgroundSyncDebouncer],
  );

  const handleOpenDetails = () => {
    setDetailsOpen(true);
  };

  const handleOpenLinkDialog = () => {
    setLinkDialogOpen(true);
  };

  const handleDelete = () => {
    if (!note) return;
    openConfirmDialog({
      title: "Delete note?",
      description: `Are you sure you want to delete "${note.title}"? This cannot be undone.`,
      handleConfirm: async () => {
        await deleteNode(note.id);
        navigate({ to: "/" });
      },
      variant: "destructive",
    });
  };

  const handleSaveNow = () => {
    saveNowRef.current?.();
  };

  const handleVersionRestored = (content: JSONContent, _title: string) => {
    setEditorKey((prev) => prev + 1);
    syncWikiLinks({ noteId, userId, content });
    syncEmbeds({ noteId, userId, content });
    syncTasks({ userId, noteId, content });
  };

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
