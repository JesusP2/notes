import { useCallback, useEffect, useMemo, type RefObject } from "react";
import { matchesShortcut, type ShortcutDefinition } from "./shortcuts";

export function usePlatform(): "mac" | "other" {
  return useMemo(() => {
    if (typeof navigator === "undefined") return "other";
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "mac" : "other";
  }, []);
}

export function useShortcut(
  shortcut: ShortcutDefinition,
  handler: () => void,
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        handler();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcut, handler, enabled]);
}

export function useShortcuts(
  shortcuts: Array<{ shortcut: ShortcutDefinition; handler: () => void }>,
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const { shortcut, handler } of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          handler();
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

export function useEditorShortcut(
  shortcut: ShortcutDefinition,
  handler: () => void,
  containerRef: RefObject<HTMLElement | null>,
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options;

  const stableHandler = useCallback(() => {
    handler();
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const activeElement = document.activeElement;
      if (!activeElement) return;

      const isWithinContainer = container.contains(activeElement);
      if (!isWithinContainer) return;

      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        stableHandler();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcut, stableHandler, containerRef, enabled]);
}
