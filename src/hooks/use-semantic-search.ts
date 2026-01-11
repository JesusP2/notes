import { useState, useEffect, useRef } from "react";
import { useCurrentUserId } from "@/hooks/use-current-user";
import {
  semanticSearch,
  type SemanticSearchResult,
} from "@/lib/semantic-search";
import { useAsyncDebouncer } from "@tanstack/react-pacer";

interface UseSemanticSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

interface UseSemanticSearchReturn {
  results: SemanticSearchResult[];
  isLoading: boolean;
  error: Error | null;
}

export function useSemanticSearch(
  query: string,
  options: UseSemanticSearchOptions = {},
): UseSemanticSearchReturn {
  const { debounceMs = 300, minQueryLength = 2, limit = 20 } = options;
  const userId = useCurrentUserId();

  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < minQueryLength) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await semanticSearch(trimmedQuery, userId, limit);
        setResults(searchResults);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Search failed"));
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, [query, userId, debounceMs, minQueryLength, limit]);

  return { results, isLoading, error };
}
