import type { JSONContent } from "@tiptap/core";
import Fuse from "fuse.js";
import { useMemo } from "react";
import type { Node } from "@/db/schema/graph";
import { useNotes } from "@/lib/graph-hooks";

// Extract clean text from JSONContent (no HTML)
function extractTextFromContent(content: JSONContent | null): string {
  if (!content) return "";
  const parts: string[] = [];
  if (content.text) parts.push(content.text);
  if (content.type === "wikiLink") {
    const title = (content.attrs?.title as string) || "";
    if (title) parts.push(title);
  }
  if (content.content) {
    for (const child of content.content) {
      parts.push(extractTextFromContent(child));
    }
  }
  return parts.join(" ");
}

// Searchable note with clean text
interface SearchableNote {
  id: string;
  title: string;
  cleanText: string;
  node: Node;
}

export interface FuzzyNoteResult {
  item: Node;
  cleanText: string;
  matches: ReadonlyArray<{
    key: string;
    indices: ReadonlyArray<readonly [number, number]>;
  }>;
  score: number;
}

const FUSE_OPTIONS: Fuse.IFuseOptions<SearchableNote> = {
  keys: [
    { name: "title", weight: 1.0 },
    { name: "cleanText", weight: 0.3 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  includeMatches: true,
};

export function useFuzzyNotes(query: string): Node[] {
  const notes = useNotes();

  const searchableNotes = useMemo(
    () =>
      notes.map((note) => ({
        id: note.id,
        title: note.title,
        cleanText: extractTextFromContent(note.content).replace(/\s+/g, " ").trim(),
        node: note,
      })),
    [notes],
  );

  const fuse = useMemo(() => new Fuse(searchableNotes, FUSE_OPTIONS), [searchableNotes]);

  return useMemo(() => {
    if (!query.trim()) return [];
    return fuse
      .search(query)
      .slice(0, 20)
      .map((result) => result.item.node);
  }, [fuse, query]);
}

export function useFuzzyNotesWithMatches(query: string): FuzzyNoteResult[] {
  const notes = useNotes();

  const searchableNotes = useMemo(
    () =>
      notes.map((note) => ({
        id: note.id,
        title: note.title,
        cleanText: extractTextFromContent(note.content).replace(/\s+/g, " ").trim(),
        node: note,
      })),
    [notes],
  );

  const fuse = useMemo(() => new Fuse(searchableNotes, FUSE_OPTIONS), [searchableNotes]);

  return useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 20).map((result) => ({
      item: result.item.node,
      cleanText: result.item.cleanText,
      matches: (result.matches ?? []).map((m) => ({
        key: m.key ?? "",
        indices: m.indices,
      })),
      score: result.score ?? 1,
    }));
  }, [fuse, query]);
}
