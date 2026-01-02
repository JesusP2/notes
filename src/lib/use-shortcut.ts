import { useCallback, useEffect, useMemo, type RefObject } from "react";
import { useUserSetting } from "@/hooks/use-user-settings";
import { getActiveShortcut, type ShortcutOverrides } from "./shortcut-settings";
import { matchesShortcut, type ShortcutDefinition, type ShortcutId } from "./shortcuts";

const SHORTCUT_OVERRIDES_KEY = "shortcut_overrides";

export function useShortcutOverrides(): ShortcutOverrides {
  const [overrides] = useUserSetting<ShortcutOverrides>(SHORTCUT_OVERRIDES_KEY, {});
  return overrides;
}

export function useShortcutOverridesState(): {
  overrides: ShortcutOverrides;
  saveOverrides: (next: ShortcutOverrides) => void;
  resetOverrides: () => void;
} {
  const [overrides, setOverrides, clearOverrides] = useUserSetting<ShortcutOverrides>(
    SHORTCUT_OVERRIDES_KEY,
    {},
  );

  const saveOverrides = useCallback(
    (next: ShortcutOverrides) => {
      if (Object.keys(next).length === 0) {
        void clearOverrides();
        return;
      }
      void setOverrides(next);
    },
    [clearOverrides, setOverrides],
  );

  const resetOverrides = useCallback(() => {
    void clearOverrides();
  }, [clearOverrides]);

  return { overrides, saveOverrides, resetOverrides };
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
