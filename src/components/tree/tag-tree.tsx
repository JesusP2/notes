import { useNavigate } from "@tanstack/react-router";
import { FilePlus, Info, Pencil, Tag, Trash2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { NoteDetailsDialog } from "@/components/notes/note-details-dialog";
import { useConfirmDialog } from "@/components/providers/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Node } from "@/db/schema/graph";
import { useTagChildren, useNodeMutations } from "@/lib/graph-hooks";
import { TreeNode } from "./tree-node";

interface TagTreeProps {
  rootId?: string;
  onSelectNode?: (node: Node) => void;
}

interface TreeBranchProps {
  parentId: string;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onExpandTag: (id: string) => void;
  onSelectNode?: (node: Node) => void;
  draggedNode: string | null;
  setDraggedNode: (id: string | null) => void;
  dragOverNode: string | null;
  setDragOverNode: (id: string | null) => void;
  onTriggerRename: (nodeId: string) => void;
  onOpenDetails: (nodeId: string) => void;
}

function TreeBranch({
  parentId,
  level,
  expandedIds,
  onToggle,
  onExpandTag,
  onSelectNode,
  draggedNode,
  setDraggedNode,
  dragOverNode,
  setDragOverNode,
  onTriggerRename,
  onOpenDetails,
}: TreeBranchProps) {
  const children = useTagChildren(parentId);
  const navigate = useNavigate();
  const { createNote, createTag, deleteNode, moveNode } = useNodeMutations();
  const { openConfirmDialog } = useConfirmDialog();
  const [, startTransition] = useTransition();

  const handleDragStart = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", nodeId);
      setDraggedNode(nodeId);
    },
    [setDraggedNode],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, node: Node) => {
      e.preventDefault();
      if (node.type === "tag" && draggedNode && draggedNode !== node.id) {
        e.dataTransfer.dropEffect = "move";
        setDragOverNode(node.id);
      }
    },
    [draggedNode, setDragOverNode],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetNode: Node) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData("text/plain");
      if (sourceId && targetNode.type === "tag" && sourceId !== targetNode.id) {
        startTransition(async () => {
          await moveNode(sourceId, targetNode.id);
        });
      }
      setDraggedNode(null);
      setDragOverNode(null);
    },
    [moveNode, setDraggedNode, setDragOverNode, startTransition],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedNode(null);
    setDragOverNode(null);
  }, [setDraggedNode, setDragOverNode]);

  const handleCreateNote = useCallback(
    (tagId: string) => {
      onExpandTag(tagId);
      startTransition(async () => {
        const note = await createNote("Untitled", tagId);
        navigate({ to: "/notes/$noteId", params: { noteId: note.id } });
        setTimeout(() => {
          const el = document.querySelector(`[data-node-id="${note.id}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
      });
    },
    [createNote, navigate, onExpandTag, startTransition],
  );

  const handleCreateTag = useCallback(
    (parentTagId: string) => {
      onExpandTag(parentTagId);
      startTransition(async () => {
        await createTag("New Tag", parentTagId);
      });
    },
    [createTag, onExpandTag, startTransition],
  );

  const handleDelete = useCallback(
    (node: Node) => {
      if (node.id === "root") return;
      openConfirmDialog({
        title: `Delete ${node.type}?`,
        description: `Are you sure you want to delete "${node.title}"?${node.type === "tag" ? " All nested items will be deleted." : ""} This cannot be undone.`,
        handleConfirm: () => {
          startTransition(async () => {
            await deleteNode(node.id);
          });
        },
        variant: "destructive",
      });
    },
    [openConfirmDialog, deleteNode, startTransition],
  );

  return (
    <ul className="space-y-0.5" onDragEnd={handleDragEnd}>
      {children.map((child) => {
        const isTag = child.type === "tag";
        const isExpanded = expandedIds.has(child.id);

        return (
          <li key={child.id}>
            <ContextMenu>
              <ContextMenuTrigger>
                <TreeNode
                  isExpandable={isTag}
                  isExpanded={isExpanded}
                  level={level}
                  node={child}
                  onSelect={() => onSelectNode?.(child)}
                  onToggle={isTag ? () => onToggle(child.id) : undefined}
                  onDragStart={(e) => handleDragStart(e, child.id)}
                  onDragOver={(e) => handleDragOver(e, child)}
                  onDrop={(e) => handleDrop(e, child)}
                  isDragOver={dragOverNode === child.id}
                />
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                {isTag && (
                  <>
                    <ContextMenuItem onClick={() => handleCreateNote(child.id)}>
                      <FilePlus className="mr-2 size-4" />
                      New Note
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCreateTag(child.id)}>
                      <Tag className="mr-2 size-4" />
                      New Tag
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                {child.type === "note" && (
                  <>
                    <ContextMenuItem onClick={() => onOpenDetails(child.id)}>
                      <Info className="mr-2 size-4" />
                      Details
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem onClick={() => onTriggerRename(child.id)}>
                  <Pencil className="mr-2 size-4" />
                  Rename
                </ContextMenuItem>
                {child.id !== "root" && (
                  <ContextMenuItem
                    onClick={() => handleDelete(child)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
            {isTag && isExpanded && (
              <TreeBranch
                expandedIds={expandedIds}
                level={level + 1}
                onSelectNode={onSelectNode}
                onToggle={onToggle}
                onExpandTag={onExpandTag}
                parentId={child.id}
                draggedNode={draggedNode}
                setDraggedNode={setDraggedNode}
                dragOverNode={dragOverNode}
                setDragOverNode={setDragOverNode}
                onTriggerRename={onTriggerRename}
                onOpenDetails={onOpenDetails}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TagTree({ rootId = "root", onSelectNode }: TagTreeProps) {
  const [expandedIds, setExpandedIds] = useState(() => new Set([rootId]));
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandTag = useCallback((id: string) => {
    setExpandedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const triggerRename = useCallback((nodeId: string) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-node-id="${nodeId}"] button`);
      if (el instanceof HTMLElement) {
        const event = new MouseEvent("dblclick", { bubbles: true });
        el.dispatchEvent(event);
      }
    }, 50);
  }, []);

  const openDetails = useCallback((nodeId: string) => {
    setDetailsNodeId(nodeId);
  }, []);

  return (
    <>
      <div aria-label="Tag tree" role="tree">
        <TreeBranch
          expandedIds={expandedIds}
          level={0}
          onSelectNode={onSelectNode}
          onToggle={toggle}
          onExpandTag={expandTag}
          parentId={rootId}
          draggedNode={draggedNode}
          setDraggedNode={setDraggedNode}
          dragOverNode={dragOverNode}
          setDragOverNode={setDragOverNode}
          onTriggerRename={triggerRename}
          onOpenDetails={openDetails}
        />
      </div>
      <NoteDetailsDialog
        noteId={detailsNodeId}
        open={detailsNodeId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsNodeId(null);
        }}
      />
    </>
  );
}
