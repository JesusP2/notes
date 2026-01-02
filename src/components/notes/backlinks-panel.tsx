import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, FileText, Link2 } from "lucide-react";
import { useState } from "react";
import type { Node } from "@/db/schema/graph";
import { useBacklinks } from "@/lib/graph-hooks";

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const backlinks = useBacklinks(noteId);

  if (backlinks.length === 0) {
    return null;
  }

  return (
    <div className="border-t bg-muted/30">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Link2 className="size-4" />
        <span>Backlinks</span>
        <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">{backlinks.length}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          <ul className="space-y-1">
            {backlinks.map((node) => (
              <li key={node.id}>
                <BacklinkItem node={node} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BacklinkItem({ node }: { node: Node }) {
  return (
    <Link
      to="/notes/$noteId"
      params={{ noteId: node.id }}
      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors group"
    >
      <FileText className="size-4 text-muted-foreground group-hover:text-foreground" />
      <span className="truncate">{node.title}</span>
    </Link>
  );
}
