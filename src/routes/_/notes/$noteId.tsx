import { usePGlite } from "@electric-sql/pglite-react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useTransition } from "react";
import { NoteEditor } from "@/components/notes/note-editor";
import { syncWikiLinks } from "@/components/notes/wiki-link-plugin";
import { useNodeById, useNodeMutations } from "@/lib/graph-hooks";

export const Route = createFileRoute("/_/notes/$noteId")({
  component: NoteEditorPage,
});

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const note = useNodeById(noteId);
  const { updateNode } = useNodeMutations();
  const db = usePGlite();
  const [, startTransition] = useTransition();

  const handleContentSave = useCallback(
    (content: string) => {
      startTransition(async () => {
        await updateNode(noteId, { content, updatedAt: new Date() });
        await syncWikiLinks({ db, noteId, content });
      });
    },
    [db, noteId, updateNode],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      startTransition(async () => {
        await updateNode(noteId, { title, updatedAt: new Date() });
      });
    },
    [noteId, updateNode],
  );

  return <NoteEditor note={note} onChange={handleContentSave} onTitleChange={handleTitleChange} />;
}
