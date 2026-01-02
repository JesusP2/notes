import { createFileRoute } from "@tanstack/react-router";
import { NoteEditor } from "@/components/notes/note-editor";

export const Route = createFileRoute("/_/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex h-full">
      <div className="flex-1">
        <NoteEditor note={null} onChange={() => undefined} />
      </div>
    </div>
  );
}
