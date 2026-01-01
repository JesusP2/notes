import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { useConfirmDialog } from "@/components/providers/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import type { Node } from "@/db/schema/graph";
import { useNodeMutations, useTaggedNotes, useTags } from "@/lib/graph-hooks";
import { TreeNode } from "./tree-node";

interface TagNotesProps {
  tagId: string;
  level: number;
  onSelectNode?: (node: Node) => void;
}

function TagNotes({ tagId, level, onSelectNode }: TagNotesProps) {
  const notes = useTaggedNotes(tagId);

  return (
    <ul className="space-y-0.5">
      {notes.map((note) => (
        <li key={note.id}>
          <TreeNode level={level} node={note} onSelect={() => onSelectNode?.(note)} />
        </li>
      ))}
      {notes.length === 0 && (
        <li
          className="text-muted-foreground px-2 py-1 text-xs"
          style={{ paddingLeft: `${level * 12}px` }}
        >
          No tagged notes.
        </li>
      )}
    </ul>
  );
}

interface TagsSectionProps {
  onSelectNode?: (node: Node) => void;
}

export function TagsSection({ onSelectNode }: TagsSectionProps) {
  const tags = useTags();
  const { createTag, deleteNode } = useNodeMutations();
  const { openConfirmDialog } = useConfirmDialog();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewTagName("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCreateSubmit = useCallback(() => {
    const trimmed = newTagName.trim();
    if (trimmed) {
      startTransition(async () => {
        await createTag(trimmed);
      });
    }
    setIsCreating(false);
    setNewTagName("");
  }, [newTagName, createTag, startTransition]);

  const handleCreateKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleCreateSubmit();
      } else if (e.key === "Escape") {
        setIsCreating(false);
        setNewTagName("");
      }
    },
    [handleCreateSubmit],
  );

  const handleDelete = useCallback(
    (tag: Node) => {
      openConfirmDialog({
        title: "Delete tag?",
        description: `Are you sure you want to delete "${tag.title}"? This will remove it from all notes.`,
        handleConfirm: () => {
          startTransition(async () => {
            await deleteNode(tag.id);
          });
        },
        variant: "destructive",
      });
    },
    [openConfirmDialog, deleteNode, startTransition],
  );

  const triggerRename = useCallback((nodeId: string) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-node-id="${nodeId}"] button`);
      if (el instanceof HTMLElement) {
        const event = new MouseEvent("dblclick", { bubbles: true });
        el.dispatchEvent(event);
      }
    }, 50);
  }, []);

  return (
    <div data-testid="tags-section">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-muted-foreground text-xs font-semibold uppercase">Tags</span>
        <button
          type="button"
          onClick={handleStartCreate}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Create tag"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <ul className="space-y-0.5">
        {isCreating && (
          <li className="px-2">
            <Input
              ref={inputRef}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onBlur={handleCreateSubmit}
              onKeyDown={handleCreateKeyDown}
              placeholder="Tag name..."
              className="h-6 text-xs py-0 px-1.5"
            />
          </li>
        )}
        {tags.map((tag) => {
          const isExpanded = expanded.has(tag.id);
          return (
            <li key={tag.id}>
              <ContextMenu>
                <ContextMenuTrigger>
                  <TreeNode
                    isExpandable
                    isExpanded={isExpanded}
                    level={0}
                    node={tag}
                    onSelect={() => onSelectNode?.(tag)}
                    onToggle={() => toggle(tag.id)}
                  />
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => triggerRename(tag.id)}>
                    <Pencil className="mr-2 size-4" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => handleDelete(tag)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
              {isExpanded && <TagNotes level={1} onSelectNode={onSelectNode} tagId={tag.id} />}
            </li>
          );
        })}
        {tags.length === 0 && !isCreating && (
          <li className="text-muted-foreground px-2 py-1 text-xs">No tags yet.</li>
        )}
      </ul>
    </div>
  );
}
