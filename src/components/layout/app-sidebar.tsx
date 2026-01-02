import { Link, useNavigate } from "@tanstack/react-router";
import { FilePlusIcon, Network, SearchIcon, Settings, Tag, TagIcon } from "lucide-react";
import { useCallback, useTransition } from "react";
import { TagTree } from "@/components/tree/tag-tree";
import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import type { Node } from "@/db/schema/graph";
import { useNodeMutations } from "@/lib/graph-hooks";
import type { ShortcutDefinition } from "@/lib/shortcuts";
import { SHORTCUTS } from "@/lib/shortcuts";
import { usePlatform } from "@/lib/use-shortcut";

export function AppSidebar() {
  const navigate = useNavigate();
  const { createTag, createNote } = useNodeMutations();
  const [isPending, startTransition] = useTransition();
  const platform = usePlatform();

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

  const handleCreateTag = useCallback(() => {
    startTransition(async () => {
      await createTag("New Tag", "root");
    });
  }, [createTag]);

  const handleOpenCommandPalette = useCallback(() => {
    const shortcut: ShortcutDefinition = SHORTCUTS.COMMAND_PALETTE;
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: shortcut.key,
        metaKey: Boolean(shortcut.modifiers?.meta && platform === "mac"),
        ctrlKey: Boolean(shortcut.modifiers?.meta && platform !== "mac"),
        altKey: Boolean(shortcut.modifiers?.alt),
        shiftKey: Boolean(shortcut.modifiers?.shift),
        bubbles: true,
      }),
    );
  }, [platform]);

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full flex-col border-r shadow-sm">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center mb-4">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <div className="bg-primary/10 p-1.5 rounded-md text-primary">
              <TagIcon className="size-4" />
            </div>
            Notes
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCommandPalette}
          className="relative flex items-center w-full h-9 px-3 text-sm text-muted-foreground bg-background/50 border border-transparent hover:border-border rounded-md transition-all shadow-sm mb-2"
        >
          <SearchIcon className="size-4 mr-2 opacity-60" />
          <span>Search notes...</span>
          <ShortcutHint shortcut={SHORTCUTS.COMMAND_PALETTE} className="ml-auto" />
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
            onClick={handleCreateTag}
            size="icon"
            className="h-8 w-8"
            variant="ghost"
            title="New Tag"
            disabled={isPending}
          >
            <Tag className="size-4 opacity-70" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 flex-1 overflow-auto">
        <div className="py-2">
          <TagTree onSelectNode={handleSelectNode} />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <div className="space-y-1">
          <Link
            to="/graph"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <Network className="size-4" />
            Graph View
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <Settings className="size-4" />
            Settings
          </Link>
        </div>
      </SidebarFooter>
    </aside>
  );
}
