import { useState, useEffect } from "react";
import { getImageUrl, isLocalImageUrl } from "@/lib/image-store";

const resolvedUrlCache = new Map<string, string>();

export function useLocalImage(src: string | undefined): {
  resolvedSrc: string | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() => {
    if (!src) return undefined;
    if (!isLocalImageUrl(src)) return src;
    return resolvedUrlCache.get(src);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(undefined);
      return;
    }

    if (!isLocalImageUrl(src)) {
      setResolvedSrc(src);
      return;
    }

    const cached = resolvedUrlCache.get(src);
    if (cached) {
      setResolvedSrc(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getImageUrl(src)
      .then((url) => {
        if (cancelled) return;
        if (url) {
          resolvedUrlCache.set(src, url);
          setResolvedSrc(url);
        } else {
          setError(new Error("Image not found in local storage"));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to load image"));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { resolvedSrc, isLoading, error };
}

export function clearLocalImageCache(): void {
  resolvedUrlCache.clear();
}
