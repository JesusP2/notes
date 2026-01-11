import { useNavigate } from "@tanstack/react-router";
import { BrainCircuitIcon, FileTextIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFuzzyNotesWithMatches } from "@/hooks/use-fuzzy-notes";
import { useSemanticSearch } from "@/hooks/use-semantic-search";
import { useRecentNotes } from "@/lib/graph-hooks";
import { highlightText, getTitleMatchIndices, getContentMatchIndices } from "@/lib/highlight-text";
import { SHORTCUTS } from "@/lib/shortcuts";
import { useShortcut } from "@/lib/use-shortcut";
import { cn } from "@/lib/utils";

type SearchMode = "fuzzy" | "semantic";

export function QuickOpen() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("fuzzy");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const recentNotes = useRecentNotes(10);
  const fuzzyResults = useFuzzyNotesWithMatches(query);
  const { results: semanticResults, isLoading: isSemanticLoading } = useSemanticSearch(query, {
    debounceMs: 400,
    minQueryLength: 3,
    limit: 20,
  });

  useShortcut(SHORTCUTS.QUICK_OPEN, () => setOpen(true));

  const hasQuery = query.trim().length > 0;
  const showRecent = !hasQuery;
  const showFuzzy = hasQuery && searchMode === "fuzzy";
  const showSemantic = hasQuery && searchMode === "semantic";

  // Build the results list
  const results = showRecent
    ? recentNotes.map((note) => ({ id: note.id, title: note.title, type: "recent" as const }))
    : showFuzzy
      ? fuzzyResults.map((r) => ({
          id: r.item.id,
          title: r.item.title,
          cleanText: r.cleanText,
          matches: r.matches,
          type: "fuzzy" as const,
        }))
      : semanticResults.map((r) => ({
          id: r.noteId,
          title: r.title,
          snippet: r.snippet,
          score: r.score,
          type: "semantic" as const,
        }));

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchMode]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selectedItem = list.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = (noteId: string) => {
    navigate({ to: "/notes/$noteId", params: { noteId } });
    setOpen(false);
    setQuery("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        handleOpenChange(false);
        break;
      case "Tab":
        e.preventDefault();
        setSearchMode((prev) => (prev === "fuzzy" ? "semantic" : "fuzzy"));
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[80vh] p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search Notes</DialogTitle>
        <DialogDescription className="sr-only">
          Search notes by title or content
        </DialogDescription>

        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <SearchIcon className="size-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setSearchMode("fuzzy")}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                searchMode === "fuzzy"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SearchIcon className="size-3.5" />
              <span>Fuzzy</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode("semantic")}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                searchMode === "semantic"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BrainCircuitIcon className="size-3.5" />
              <span>Semantic</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[60vh]">
          {/* Loading state */}
          {showSemantic && isSemanticLoading && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              <span>Searching...</span>
            </div>
          )}

          {/* Empty state */}
          {!isSemanticLoading && hasQuery && results.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No notes found
            </div>
          )}

          {/* Results list */}
          {results.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1.5 text-xs text-muted-foreground">
                {showRecent ? "Recent Notes" : showSemantic && isSemanticLoading ? "Updating..." : "Results"}
              </div>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  data-index={index}
                  onClick={() => handleSelect(result.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    selectedIndex === index ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <FileTextIcon className="size-4 text-muted-foreground shrink-0" />

                  <div className="flex-1 min-w-0">
                    {/* Title with highlighting for fuzzy results */}
                    <div className="truncate">
                      {result.type === "fuzzy" && result.matches ? (
                        <span>
                          {highlightText(
                            result.title,
                            getTitleMatchIndices(result.matches),
                          )}
                        </span>
                      ) : (
                        result.title
                      )}
                    </div>

                    {/* Content for fuzzy results */}
                    {result.type === "fuzzy" && result.cleanText && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {getContentMatchIndices(result.matches).length > 0 ? (
                          <span>
                            {highlightText(
                              result.cleanText.slice(0, 120),
                              getContentMatchIndices(result.matches)
                                .filter(([start]) => start < 120)
                                .map(([start, end]) => [start, Math.min(end, 119)] as readonly [number, number]),
                            )}
                            {result.cleanText.length > 120 ? "..." : ""}
                          </span>
                        ) : (
                          <>
                            {result.cleanText.slice(0, 120)}
                            {result.cleanText.length > 120 ? "..." : ""}
                          </>
                        )}
                      </div>
                    )}

                    {/* Snippet for semantic results */}
                    {result.type === "semantic" && result.snippet && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {result.snippet.slice(0, 100)}
                        {result.snippet.length > 100 ? "..." : ""}
                      </div>
                    )}
                  </div>

                  {/* Score for semantic results */}
                  {result.type === "semantic" && result.score !== undefined && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {Math.round(result.score * 100)}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd> open
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Tab</kbd> toggle mode
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
