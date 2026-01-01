import { usePGlite } from "@electric-sql/pglite-react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { NoteEditor } from "@/components/notes/note-editor";
import { buildWikiLinkTargets, syncWikiLinks } from "@/components/notes/wiki-link-plugin";
import { useGraphData, useNodeById, useNodeMutations } from "@/lib/graph-hooks";

export const Route = createFileRoute("/_/notes/$noteId")({
  component: NoteEditorPage,
});

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const note = useNodeById(noteId);
  const { updateNode } = useNodeMutations();
  const { nodes } = useGraphData();
  const db = usePGlite();

  const linkTargets = useMemo(() => buildWikiLinkTargets(nodes), [nodes]);

  const handleContentSave = useCallback(
    async (content: string) => {
      await updateNode(noteId, { content, updatedAt: new Date() });
      await syncWikiLinks({ db, noteId, content });
    },
    [db, noteId, updateNode],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      updateNode(noteId, { title, updatedAt: new Date() });
    },
    [noteId, updateNode],
  );

  return (
    <NoteEditor
      note={note}
      onChange={handleContentSave}
      onTitleChange={handleTitleChange}
      linkTargets={linkTargets}
    />
  );
}
