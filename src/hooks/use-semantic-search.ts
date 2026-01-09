import { useState, useEffect, useRef } from "react";
import { useCurrentUserId } from "@/hooks/use-current-user";
import {
  semanticSearch,
  type SemanticSearchResult,
} from "@/lib/semantic-search";

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < minQueryLength) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    timeoutRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        console.log('search')
        const searchResults = await semanticSearch(trimmedQuery, userId, limit);

        if (!controller.signal.aborted) {
          setResults(searchResults);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error("Search failed"));
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, userId, debounceMs, minQueryLength, limit]);

  return { results, isLoading, error };
}
