import { Link, useNavigate } from "@tanstack/react-router";
import {
  FilePlusIcon,
  LayoutTemplate,
  Network,
  NotebookPen,
  PenTool,
  Pencil,
  Pin,
  PlusIcon,
  SearchIcon,
  Settings,
  Folder,
  Trash2,
} from "lucide-react";
import type { FocusEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useConfirmDialog } from "@/components/providers/confirm-dialog";
import { TagTree } from "@/components/tree/tag-tree";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { Node } from "@/db/schema/graph";
import { ROOT_TAG_ID } from "@/hooks/use-current-user";
import { useNodeMutations, usePinnedNotes, useTemplates } from "@/lib/graph-hooks";
import type { ShortcutDefinition } from "@/lib/shortcuts";
import { SHORTCUTS } from "@/lib/shortcuts";
import { usePlatform } from "@/lib/use-shortcut";

export function AppSidebar() {
  const navigate = useNavigate();
  const { createTag, createNote, createTemplate, createNoteFromTemplate, createCanvas, updateNode, deleteNode } =
    useNodeMutations();
  const pinnedNotes = usePinnedNotes();
  const templates = useTemplates();
  const platform = usePlatform();
  const { openConfirmDialog } = useConfirmDialog();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTemplateId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTemplateId]);

  const handleSelectNode = (node: Node) => {
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
  };

  const handleCreateNote = () => {
    const note = createNote("Untitled Note", ROOT_TAG_ID);
    navigate({
      to: "/notes/$noteId",
      params: { noteId: note.id },
    });
  };

  const handleCreateTag = () => {
    createTag("New Folder", ROOT_TAG_ID);
  };

  const handleCreateCanvas = () => {
    const canvas = createCanvas("New Canvas", ROOT_TAG_ID);
    navigate({
      to: "/canvas/$canvasId",
      params: { canvasId: canvas.id },
    });
  };

  const handleCreateTemplate = () => {
    const template = createTemplate("New Template");
    navigate({
      to: "/notes/$noteId",
      params: { noteId: template.id },
    });
  };

  const handleUseTemplate = async (templateId: string) => {
    const note = await createNoteFromTemplate(templateId, undefined, ROOT_TAG_ID);
    if (!note) return;
    navigate({
      to: "/notes/$noteId",
      params: { noteId: note.id },
    });
  };

  const handleOpenSearch = () => {
    const shortcut: ShortcutDefinition = SHORTCUTS.QUICK_OPEN;
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
  };

  const handleSearchFocus = (event: FocusEvent<HTMLInputElement>) => {
    handleOpenSearch();
    event.currentTarget.blur();
  };

  const handleStartRenameTemplate = (template: Node) => {
    setEditValue(template.title);
    setEditingTemplateId(template.id);
  };

  const handleRenameSubmit = () => {
    if (editingTemplateId) {
      const trimmed = editValue.trim();
      if (trimmed) {
        updateNode(editingTemplateId, { title: trimmed });
      }
    }
    setEditingTemplateId(null);
    setEditValue("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditingTemplateId(null);
      setEditValue("");
    }
  };

  const handleDeleteTemplate = (template: Node) => {
    openConfirmDialog({
      title: "Delete template?",
      description: `Are you sure you want to delete "${template.title}"? This cannot be undone.`,
      handleConfirm: () => {
        void deleteNode(template.id);
      },
      variant: "destructive",
    });
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 text-lg font-semibold">
          <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
            <NotebookPen className="size-4" />
          </div>
          Notes
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            placeholder="Search notes..."
            readOnly
            className="pr-16 pl-8"
            onFocus={handleSearchFocus}
          />
          <ShortcutHint
            shortcut={SHORTCUTS.QUICK_OPEN}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          />
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleCreateNote} type="button">
              <FilePlusIcon />
              <span>New Note</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleCreateTag} type="button">
              <Folder />
              <span>New Folder</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleCreateCanvas} type="button">
              <PenTool />
              <span>New Canvas</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {pinnedNotes.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Pinned</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pinnedNotes.map((note) => (
                  <SidebarMenuItem key={note.id}>
                    <SidebarMenuButton onClick={() => handleSelectNode(note)} type="button">
                      <Pin className="text-muted-foreground" />
                      <span>{note.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Notes</SidebarGroupLabel>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 w-5 rounded-none p-0 focus-visible:ring-2 [&>svg]:size-4 flex aspect-square items-center justify-center outline-hidden transition-transform [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden group-data-[collapsible=icon]:hidden"
              title="Create new..."
              aria-label="Create new..."
            >
              <PlusIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateNote}>
                <FilePlusIcon />
                <span>New Note</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateTag}>
                <Folder />
                <span>New Folder</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <SidebarGroupContent>
            <TagTree onSelectNode={handleSelectNode} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Templates</SidebarGroupLabel>
          <SidebarGroupAction
            onClick={handleCreateTemplate}
            title="New Template"
            type="button"
            aria-label="New Template"
          >
            <PlusIcon />
          </SidebarGroupAction>
          <SidebarGroupContent>
            {templates.length > 0 ? (
              <SidebarMenu className="pl-4">
                {templates.map((template) => (
                  <SidebarMenuItem key={template.id}>
                    {editingTemplateId === template.id ? (
                      <div className="flex items-center gap-2 px-2 py-1">
                        <LayoutTemplate className="text-muted-foreground size-4 shrink-0" />
                        <Input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleRenameSubmit}
                          onKeyDown={handleRenameKeyDown}
                          className="h-6 text-xs py-0 px-1.5 flex-1 min-w-0"
                        />
                      </div>
                    ) : (
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <SidebarMenuButton
                            onClick={() =>
                              navigate({
                                to: "/notes/$noteId",
                                params: { noteId: template.id },
                              })
                            }
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStartRenameTemplate(template);
                            }}
                            type="button"
                          >
                            <LayoutTemplate className="text-muted-foreground" />
                            <span>{template.title}</span>
                          </SidebarMenuButton>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem onClick={() => void handleUseTemplate(template.id)}>
                            <FilePlusIcon className="mr-2 size-4" />
                            Create note
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => handleStartRenameTemplate(template)}>
                            <Pencil className="mr-2 size-4" />
                            Rename
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => handleDeleteTemplate(template)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    )}
                    {editingTemplateId !== template.id && (
                      <SidebarMenuAction
                        onClick={() => void handleUseTemplate(template.id)}
                        title="Create note from template"
                        aria-label="Create note from template"
                        type="button"
                      >
                        <FilePlusIcon />
                      </SidebarMenuAction>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <div className="px-2 pl-6 text-xs text-muted-foreground">No templates yet.</div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/graph" />}>
              <Network />
              <span>Graph View</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/settings" />}>
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
