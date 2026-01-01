import { createFileRoute } from "@tanstack/react-router";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteSidebar } from "@/components/notes/note-sidebar";
import { useGraphData } from "@/lib/graph-hooks";

export const Route = createFileRoute("/_/")({
  component: Home,
});

function Home() {
  const { nodes } = useGraphData();

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <NoteEditor note={null} onChange={() => undefined} />
      </div>
      <NoteSidebar note={null} outgoingEdges={[]} incomingEdges={[]} nodes={nodes} />
    </div>
  );
}
