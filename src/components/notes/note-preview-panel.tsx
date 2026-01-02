import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useMemo } from "react";
import { StreamdownRenderer } from "@/components/streamdown";
import { Badge } from "@/components/ui/badge";
import type { Node } from "@/db/schema/graph";
import { useGraphData } from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";
import {
  buildWikiLinkTargets,
  EMBED_LINK_REGEX,
  renderWikiLinks,
  stripEmbeds,
} from "./wiki-link-plugin";

type NoteSegment = { type: "text"; value: string } | { type: "embed"; title: string };

const MAX_EMBED_CHARS = 4000;

function splitByEmbeds(content: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(EMBED_LINK_REGEX)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, matchIndex) });
    }
    const title = match[1]?.trim();
    if (title) {
      segments.push({ type: "embed", title });
    }
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: content }];
}

function truncateContent(value: string) {
  if (value.length <= MAX_EMBED_CHARS) return value;
  return `${value.slice(0, MAX_EMBED_CHARS)}\n\n…`;
}

function NoteEmbedCard({
  title,
  note,
  linkTargets,
}: {
  title: string;
  note: Node | null;
  linkTargets: Record<string, string>;
}) {
  if (!note) {
    return (
      <div className="rounded-md border border-dashed bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        Embedded note "{title}" not found.
      </div>
    );
  }

  const rawContent = stripEmbeds(note.content ?? "");
  const content = truncateContent(rawContent);
  const rendered = renderWikiLinks(content, linkTargets);
  const hasBody = rendered.trim().length > 0;

  return (
    <div className="rounded-md border bg-muted/15 px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-3.5 text-muted-foreground" />
          <Link
            to="/notes/$noteId"
            params={{ noteId: note.id }}
            className="text-sm font-semibold truncate hover:underline"
          >
            {note.title}
          </Link>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          Embed
        </Badge>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {hasBody ? (
          <StreamdownRenderer className="text-foreground/90">{rendered}</StreamdownRenderer>
        ) : (
          <span>No content to embed.</span>
        )}
      </div>
    </div>
  );
}

export function NotePreviewPanel({ note }: { note: Node | null }) {
  const { nodes } = useGraphData();

  const linkTargets = useMemo(() => buildWikiLinkTargets(nodes), [nodes]);
  const noteMap = useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes) {
      if (node.type !== "note") continue;
      const key = node.title.trim().toLowerCase();
      if (!key || map.has(key)) continue;
      map.set(key, node);
    }
    return map;
  }, [nodes]);

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/10 p-8 text-center animate-in fade-in-50">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="size-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No Preview</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Select a note to see a rendered preview with embeds.
        </p>
      </div>
    );
  }

  const content = note.content ?? "";
  const segments = splitByEmbeds(content);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto w-full px-8 py-6 space-y-6">
          {segments.map((segment, index) => {
            if (segment.type === "text") {
              const rendered = renderWikiLinks(segment.value, linkTargets);
              if (!rendered.trim()) {
                return null;
              }
              return (
                <StreamdownRenderer key={`text-${index}`} className={cn("text-foreground/90")}>
                  {rendered}
                </StreamdownRenderer>
              );
            }

            const embedNote = noteMap.get(segment.title.toLowerCase()) ?? null;
            return (
              <NoteEmbedCard
                key={`embed-${index}-${segment.title}`}
                title={segment.title}
                note={embedNote}
                linkTargets={linkTargets}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
