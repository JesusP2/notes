import { Link, useNavigate } from "@tanstack/react-router";
import {
  ClipboardList,
  FilePlusIcon,
  LayoutTemplate,
  Network,
  Pin,
  PenTool,
  SearchIcon,
  Settings,
  Star,
  Tag,
  TagIcon,
} from "lucide-react";
import { useCallback, useTransition } from "react";
import { TagTree } from "@/components/tree/tag-tree";
import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import type { Node } from "@/db/schema/graph";
import { ROOT_TAG_ID } from "@/hooks/use-current-user";
import {
  useFavoriteNotes,
  useNodeMutations,
  usePinnedNotes,
  useTemplates,
} from "@/lib/graph-hooks";
import type { ShortcutDefinition } from "@/lib/shortcuts";
import { SHORTCUTS } from "@/lib/shortcuts";
import { usePlatform } from "@/lib/use-shortcut";

export function AppSidebar() {
  const navigate = useNavigate();
  const { createTag, createNote, createTemplate, createNoteFromTemplate, createCanvas } =
    useNodeMutations();
  const pinnedNotes = usePinnedNotes();
  const favoriteNotes = useFavoriteNotes();
  const templates = useTemplates();
  const [isPending, startTransition] = useTransition();
  const platform = usePlatform();

  const handleSelectNode = useCallback(
    (node: Node) => {
      if (node.type === "note" || node.type === "template") {
        navigate({
          to: "/notes/$noteId",
          params: { noteId: node.id },
        });
      } else if (node.type === "canvas") {
        navigate({
          to: "/canvas/$canvasId",
          params: { canvasId: node.id },
        });
      }
    },
    [navigate],
  );

  const handleCreateNote = useCallback(() => {
    startTransition(async () => {
      const note = await createNote("Untitled Note", ROOT_TAG_ID);
      navigate({
        to: "/notes/$noteId",
        params: { noteId: note.id },
      });
    });
  }, [createNote, navigate]);

  const handleCreateTag = useCallback(() => {
    startTransition(async () => {
      await createTag("New Tag", ROOT_TAG_ID);
    });
  }, [createTag]);

  const handleCreateCanvas = useCallback(() => {
    startTransition(async () => {
      const canvas = await createCanvas("New Canvas", ROOT_TAG_ID);
      navigate({
        to: "/canvas/$canvasId",
        params: { canvasId: canvas.id },
      });
    });
  }, [createCanvas, navigate]);

  const handleCreateTemplate = useCallback(() => {
    startTransition(async () => {
      const template = await createTemplate("New Template");
      navigate({
        to: "/notes/$noteId",
        params: { noteId: template.id },
      });
    });
  }, [createTemplate, navigate]);

  const handleUseTemplate = useCallback(
    (templateId: string) => {
      startTransition(async () => {
        const note = await createNoteFromTemplate(templateId, undefined, ROOT_TAG_ID);
        if (!note) return;
        navigate({
          to: "/notes/$noteId",
          params: { noteId: note.id },
        });
      });
    },
    [createNoteFromTemplate, navigate],
  );

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
          <Button
            onClick={handleCreateCanvas}
            size="icon"
            className="h-8 w-8"
            variant="ghost"
            title="New Canvas"
            disabled={isPending}
          >
            <PenTool className="size-4 opacity-70" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 flex-1 overflow-auto">
        <div className="py-2 space-y-4">
          {pinnedNotes.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Pin className="size-3" />
                Pinned
              </div>
              <div className="space-y-1">
                {pinnedNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectNode(note)}
                    className="flex w-full min-w-0 items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted text-left"
                  >
                    <Pin className="size-3 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{note.title}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {favoriteNotes.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Star className="size-3" />
                Favorites
              </div>
              <div className="space-y-1">
                {favoriteNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleSelectNode(note)}
                    className="flex w-full min-w-0 items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted text-left"
                  >
                    <Star className="size-3 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{note.title}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {templates.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="size-3" />
                  Templates
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCreateTemplate}
                  title="New Template"
                >
                  <FilePlusIcon className="size-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        navigate({ to: "/notes/$noteId", params: { noteId: template.id } })
                      }
                      className="flex flex-1 min-w-0 items-center gap-2 text-left"
                    >
                      <LayoutTemplate className="size-3 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{template.title}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleUseTemplate(template.id)}
                      title="Create note from template"
                    >
                      <FilePlusIcon className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {templates.length === 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between px-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="size-3" />
                  Templates
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCreateTemplate}
                  title="New Template"
                >
                  <FilePlusIcon className="size-3" />
                </Button>
              </div>
              <p className="px-2 text-[11px] text-muted-foreground">No templates yet.</p>
            </section>
          )}
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
            to="/tasks"
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <ClipboardList className="size-4" />
            Tasks
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
