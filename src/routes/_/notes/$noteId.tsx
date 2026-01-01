import { usePGlite } from "@electric-sql/pglite-react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useTransition } from "react";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteSidebar } from "@/components/notes/note-sidebar";
import { syncWikiLinks } from "@/components/notes/wiki-link-plugin";
import { useGraphData, useNodeById, useNodeEdges, useNodeMutations } from "@/lib/graph-hooks";

export const Route = createFileRoute("/_/notes/$noteId")({
  component: NoteEditorPage,
});

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const note = useNodeById(noteId);
  const { outgoing, incoming } = useNodeEdges(noteId);
  const { nodes } = useGraphData();
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

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-hidden">
        <NoteEditor note={note} onChange={handleContentSave} />
      </div>
      <NoteSidebar note={note} outgoingEdges={outgoing} incomingEdges={incoming} nodes={nodes} />
    </div>
  );
}
