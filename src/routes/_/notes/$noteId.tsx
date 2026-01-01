import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { usePGlite } from "@electric-sql/pglite-react";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteSidebar } from "@/components/notes/note-sidebar";
import { buildWikiLinkTargets, syncWikiLinks } from "@/components/notes/wiki-link-plugin";
import { useGraphData, useNodeById, useNodeEdges, useNodeMutations } from "@/lib/graph-hooks";

export const Route = createFileRoute("/_/notes/$noteId")({
  component: NoteEditorPage,
});

function NoteEditorPage() {
  const { noteId } = Route.useParams();
  const note = useNodeById(noteId);
  const { outgoing, incoming } = useNodeEdges(noteId);
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
    <div className="flex h-full">
      <div className="flex-1">
        <NoteEditor
          note={note}
          onChange={handleContentSave}
          onTitleChange={handleTitleChange}
          linkTargets={linkTargets}
        />
      </div>
      <NoteSidebar note={note} outgoingEdges={outgoing} incomingEdges={incoming} nodes={nodes} />
    </div>
  );
}
