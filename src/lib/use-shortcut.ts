import { useCallback, useEffect, useMemo, useSyncExternalStore, type RefObject } from "react";
import { getActiveShortcut, loadOverrides, type ShortcutOverrides } from "./shortcut-settings";
import { matchesShortcut, type ShortcutDefinition, type ShortcutId } from "./shortcuts";

function subscribeToStorage(callback: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === "shortcut-overrides") {
      callback();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getOverridesSnapshot(): ShortcutOverrides {
  return loadOverrides();
}

function getServerSnapshot(): ShortcutOverrides {
  return {};
}

export function useShortcutOverrides(): ShortcutOverrides {
  return useSyncExternalStore(subscribeToStorage, getOverridesSnapshot, getServerSnapshot);
}

export function useActiveShortcut(id: ShortcutId): ShortcutDefinition {
  const overrides = useShortcutOverrides();
  return useMemo(() => getActiveShortcut(id, overrides), [id, overrides]);
}

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
