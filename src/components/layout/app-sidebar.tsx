import { Link, useNavigate } from "@tanstack/react-router";
import { FilePlusIcon, FolderIcon, FolderPlusIcon, Network, SearchIcon } from "lucide-react";
import { useCallback, useTransition } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { FolderTree } from "@/components/tree/folder-tree";
import { TagsSection } from "@/components/tree/tags-section";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import type { Node } from "@/db/schema/graph";
import { useNodeMutations } from "@/lib/graph-hooks";

export function AppSidebar() {
  const navigate = useNavigate();
  const { createFolder, createNote } = useNodeMutations();
  const [isPending, startTransition] = useTransition();

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

  const handleCreateNote = useCallback(() => {
    startTransition(async () => {
      const note = await createNote("Untitled Note", "root");
      navigate({
        to: "/notes/$noteId",
        params: { noteId: note.id },
      });
    });
  }, [createNote, navigate]);

  const handleCreateFolder = useCallback(() => {
    startTransition(async () => {
      await createFolder("New Folder", "root");
    });
  }, [createFolder]);

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

        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
          className="relative flex items-center w-full h-9 px-3 text-sm text-muted-foreground bg-background/50 border border-transparent hover:border-border rounded-md transition-all shadow-sm mb-2"
        >
          <SearchIcon className="size-4 mr-2 opacity-60" />
          <span>Search notes...</span>
          <Kbd className="ml-auto">⌘K</Kbd>
        </button>

        <div className="flex gap-1.5 mt-2">
          <Button
            onClick={handleCreateNote}
            size="sm"
            className="flex-1 justify-start h-8 px-2 font-medium"
            variant="ghost"
            disabled={isPending}
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
            disabled={isPending}
          >
            <FolderPlusIcon className="size-4 opacity-70" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 flex-1 overflow-auto">
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

      <SidebarFooter className="p-2 border-t">
        <Link
          to="/graph"
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Network className="size-4" />
          Graph View
        </Link>
      </SidebarFooter>
    </aside>
  );
}
