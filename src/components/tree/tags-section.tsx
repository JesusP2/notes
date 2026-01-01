import { useCallback, useState } from "react";
import type { Node } from "@/db/schema/graph";
import { useTaggedNotes, useTags } from "@/lib/graph-hooks";
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
        <li className="text-muted-foreground px-2 py-1 text-xs" style={{ paddingLeft: `${level * 12}px` }}>
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

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

  return (
    <div data-testid="tags-section">
      <div className="text-muted-foreground px-2 py-1 text-xs font-semibold uppercase">Tags</div>
      <ul className="space-y-0.5">
        {tags.map((tag) => {
          const isExpanded = expanded.has(tag.id);
          return (
            <li key={tag.id}>
              <TreeNode
                isExpandable
                isExpanded={isExpanded}
                level={0}
                node={tag}
                onSelect={() => onSelectNode?.(tag)}
                onToggle={() => toggle(tag.id)}
              />
              {isExpanded && <TagNotes level={1} onSelectNode={onSelectNode} tagId={tag.id} />}
            </li>
          );
        })}
        {tags.length === 0 && (
          <li className="text-muted-foreground px-2 py-1 text-xs">No tags yet.</li>
        )}
      </ul>
    </div>
  );
}
