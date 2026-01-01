import { useNavigate } from "@tanstack/react-router";
import { FilePlusIcon, FolderIcon, FolderPlusIcon, SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { FolderTree } from "@/components/tree/folder-tree";
import { TagsSection } from "@/components/tree/tags-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import type { Node } from "@/db/schema/graph";
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
    <aside className="bg-sidebar text-sidebar-foreground flex h-full flex-col border-r shadow-sm">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <div className="bg-primary/10 p-1.5 rounded-md text-primary">
              <FolderIcon className="size-4 fill-current" />
            </div>
            Notes
          </div>
          <ModeToggle />
        </div>

        <div className="relative mb-2">
          <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            className="pl-9 h-9 bg-background/50 border-transparent hover:border-border focus:bg-background transition-all shadow-sm"
            placeholder="Search notes..."
          />
        </div>

        <div className="flex gap-1.5 mt-2">
          <Button
            onClick={handleCreateNote}
            size="sm"
            className="flex-1 justify-start h-8 px-2 font-medium"
            variant="ghost"
            disabled={isCreatingNote}
          >
            <FilePlusIcon className="mr-2 size-3.5 opacity-70" />
            New Note
          </Button>
          <Button
            onClick={handleCreateFolder}
            size="icon"
            className="h-8 w-8"
            variant="ghost"
            title="New Folder"
            disabled={isCreatingFolder}
          >
            <FolderPlusIcon className="size-4 opacity-70" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <div className="space-y-6 py-2">
          <div>
            <div className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Folders
            </div>
            <FolderTree onSelectNode={handleSelectNode} />
          </div>

          <div className="mt-6">
            <div className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tags
            </div>
            <TagsSection onSelectNode={handleSelectNode} />
          </div>
        </div>
      </SidebarContent>
    </aside>
  );
}
