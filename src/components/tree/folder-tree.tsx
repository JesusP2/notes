import { useNavigate } from "@tanstack/react-router";
import { FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { useConfirmDialog } from "@/components/providers/confirm-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Node } from "@/db/schema/graph";
import { useFolderChildren, useNodeMutations } from "@/lib/graph-hooks";
import { TreeNode } from "./tree-node";

interface FolderTreeProps {
  rootId?: string;
  onSelectNode?: (node: Node) => void;
}

interface TreeBranchProps {
  parentId: string;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onExpandFolder: (id: string) => void;
  onSelectNode?: (node: Node) => void;
  draggedNode: string | null;
  setDraggedNode: (id: string | null) => void;
  dragOverNode: string | null;
  setDragOverNode: (id: string | null) => void;
  onTriggerRename: (nodeId: string) => void;
}

function TreeBranch({
  parentId,
  level,
  expandedIds,
  onToggle,
  onExpandFolder,
  onSelectNode,
  draggedNode,
  setDraggedNode,
  dragOverNode,
  setDragOverNode,
  onTriggerRename,
}: TreeBranchProps) {
  const children = useFolderChildren(parentId);
  const navigate = useNavigate();
  const { createNote, createFolder, deleteNode, moveNode } = useNodeMutations();
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
      if (node.type === "folder" && draggedNode && draggedNode !== node.id) {
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
      if (sourceId && targetNode.type === "folder" && sourceId !== targetNode.id) {
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
    (folderId: string) => {
      onExpandFolder(folderId);
      startTransition(async () => {
        const note = await createNote("Untitled", folderId);
        navigate({ to: "/notes/$noteId", params: { noteId: note.id } });
        setTimeout(() => {
          const el = document.querySelector(`[data-node-id="${note.id}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
      });
    },
    [createNote, navigate, onExpandFolder, startTransition],
  );

  const handleCreateFolder = useCallback(
    (folderId: string) => {
      startTransition(async () => {
        await createFolder("New Folder", folderId);
      });
    },
    [createFolder, startTransition],
  );

  const handleDelete = useCallback(
    (node: Node) => {
      openConfirmDialog({
        title: `Delete ${node.type}?`,
        description: `Are you sure you want to delete "${node.title}"? This cannot be undone.`,
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
        const isFolder = child.type === "folder";
        const isExpanded = expandedIds.has(child.id);

        return (
          <li key={child.id}>
            <ContextMenu>
              <ContextMenuTrigger>
                <TreeNode
                  isExpandable={isFolder}
                  isExpanded={isExpanded}
                  level={level}
                  node={child}
                  onSelect={() => onSelectNode?.(child)}
                  onToggle={isFolder ? () => onToggle(child.id) : undefined}
                  onDragStart={(e) => handleDragStart(e, child.id)}
                  onDragOver={(e) => handleDragOver(e, child)}
                  onDrop={(e) => handleDrop(e, child)}
                  isDragOver={dragOverNode === child.id}
                />
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                {isFolder && (
                  <>
                    <ContextMenuItem onClick={() => handleCreateNote(child.id)}>
                      <FilePlus className="mr-2 size-4" />
                      New Note
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCreateFolder(child.id)}>
                      <FolderPlus className="mr-2 size-4" />
                      New Folder
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem onClick={() => onTriggerRename(child.id)}>
                  <Pencil className="mr-2 size-4" />
                  Rename
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => handleDelete(child)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            {isFolder && isExpanded && (
              <TreeBranch
                expandedIds={expandedIds}
                level={level + 1}
                onSelectNode={onSelectNode}
                onToggle={onToggle}
                onExpandFolder={onExpandFolder}
                parentId={child.id}
                draggedNode={draggedNode}
                setDraggedNode={setDraggedNode}
                dragOverNode={dragOverNode}
                setDragOverNode={setDragOverNode}
                onTriggerRename={onTriggerRename}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FolderTree({ rootId = "root", onSelectNode }: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState(() => new Set([rootId]));
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);

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

  const expandFolder = useCallback((id: string) => {
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

  return (
    <div aria-label="Folder tree" role="tree">
      <TreeBranch
        expandedIds={expandedIds}
        level={0}
        onSelectNode={onSelectNode}
        onToggle={toggle}
        onExpandFolder={expandFolder}
        parentId={rootId}
        draggedNode={draggedNode}
        setDraggedNode={setDraggedNode}
        dragOverNode={dragOverNode}
        setDragOverNode={setDragOverNode}
        onTriggerRename={triggerRename}
      />
    </div>
  );
}
