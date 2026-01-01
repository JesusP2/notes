import { useCallback, useState } from "react";
import { FolderIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Node } from "@/db/schema/graph";
import { FolderTree } from "@/components/tree/folder-tree";
import { TagsSection } from "@/components/tree/tags-section";
import { Button } from "@/components/ui/button";
import { SidebarContent, SidebarHeader, SidebarSeparator } from "@/components/ui/sidebar";
import { useNodeMutations } from "@/lib/graph-hooks";

export function AppSidebar() {
  const navigate = useNavigate();
  const { createFolder, createNote } = useNodeMutations();
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleSelectNode = useCallback(
    (node: Node) => {
      if (node.type !== "note") {
        return;
      }
      navigate({
        to: "/notes/$noteId",
        params: { noteId: node.id },
      });
    },
    [navigate],
  );

  const handleCreateNote = useCallback(async () => {
    if (isCreatingNote) {
      return;
    }
    setIsCreatingNote(true);
    try {
      const note = await createNote("Untitled Note", "root");
      navigate({
        to: "/notes/$noteId",
        params: { noteId: note.id },
      });
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNote, isCreatingNote, navigate]);

  const handleCreateFolder = useCallback(async () => {
    if (isCreatingFolder) {
      return;
    }
    setIsCreatingFolder(true);
    try {
      await createFolder("New Folder", "root");
    } finally {
      setIsCreatingFolder(false);
    }
  }, [createFolder, isCreatingFolder]);

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full flex-col border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FolderIcon className="size-4" />
          Notes Graph
        </div>
        <p className="text-muted-foreground text-xs">Select a note to edit.</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={handleCreateNote}
            size="xs"
            variant="outline"
            disabled={isCreatingNote}
          >
            New Note
          </Button>
          <Button
            onClick={handleCreateFolder}
            size="xs"
            variant="ghost"
            disabled={isCreatingFolder}
          >
            New Folder
          </Button>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <div className="space-y-4 py-2">
          <FolderTree onSelectNode={handleSelectNode} />
          <SidebarSeparator />
          <TagsSection onSelectNode={handleSelectNode} />
        </div>
      </SidebarContent>
    </aside>
  );
}
