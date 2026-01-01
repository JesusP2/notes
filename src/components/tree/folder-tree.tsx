import { useCallback, useMemo, useState } from "react";
import type { Node } from "@/db/schema/graph";
import { useFolderChildren, useNodeById } from "@/lib/graph-hooks";
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
  onSelectNode?: (node: Node) => void;
}

function TreeBranch({ parentId, level, expandedIds, onToggle, onSelectNode }: TreeBranchProps) {
  const children = useFolderChildren(parentId);

  return (
    <ul className="space-y-0.5">
      {children.map((child) => {
        const isFolder = child.type === "folder";
        const isExpanded = expandedIds.has(child.id);

        return (
          <li key={child.id}>
            <TreeNode
              isExpandable={isFolder}
              isExpanded={isExpanded}
              level={level}
              node={child}
              onSelect={() => onSelectNode?.(child)}
              onToggle={isFolder ? () => onToggle(child.id) : undefined}
            />
            {isFolder && isExpanded && (
              <TreeBranch
                expandedIds={expandedIds}
                level={level + 1}
                onSelectNode={onSelectNode}
                onToggle={onToggle}
                parentId={child.id}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FolderTree({ rootId = "root", onSelectNode }: FolderTreeProps) {
  const root = useNodeById(rootId);
  const [expandedIds, setExpandedIds] = useState(() => new Set([rootId]));

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

  const isRootExpanded = expandedIds.has(rootId);
  const rootNode = useMemo(
    () =>
      root ?? {
        id: rootId,
        type: "folder" as const,
        title: "Root",
        content: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    [root, rootId],
  );

  return (
    <div aria-label="Folder tree" role="tree">
      <TreeNode
        isExpandable
        isExpanded={isRootExpanded}
        level={0}
        node={rootNode}
        onSelect={() => onSelectNode?.(rootNode)}
        onToggle={() => toggle(rootId)}
      />
      {isRootExpanded && (
        <TreeBranch
          expandedIds={expandedIds}
          level={1}
          onSelectNode={onSelectNode}
          onToggle={toggle}
          parentId={rootId}
        />
      )}
    </div>
  );
}
