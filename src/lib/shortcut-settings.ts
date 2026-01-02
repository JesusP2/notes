import {
  SHORTCUTS,
  type ShortcutDefinition,
  type ShortcutId,
  type ShortcutModifiers,
} from "./shortcuts";

export interface ShortcutOverride {
  key: string;
  modifiers: ShortcutModifiers;
}

export type ShortcutOverrides = Partial<Record<ShortcutId, ShortcutOverride>>;

const BROWSER_RESERVED_SHORTCUTS = new Set([
  "meta+t",
  "meta+n",
  "meta+w",
  "meta+q",
  "meta+r",
  "meta+shift+t",
  "meta+l",
  "meta+d",
  "meta+f",
  "meta+shift+n",
  "ctrl+t",
  "ctrl+n",
  "ctrl+w",
  "ctrl+q",
  "ctrl+r",
  "ctrl+shift+t",
  "ctrl+l",
  "ctrl+d",
  "ctrl+f",
  "ctrl+shift+n",
]);

function shortcutToString(key: string, modifiers: ShortcutModifiers): string {
  const parts: string[] = [];
  if (modifiers.meta) parts.push("meta");
  if (modifiers.shift) parts.push("shift");
  if (modifiers.alt) parts.push("alt");
  parts.push(key.toLowerCase());
  return parts.join("+");
}

export function getActiveShortcut(
  id: ShortcutId,
  overrides: ShortcutOverrides = {},
): ShortcutDefinition {
  const defaultShortcut = SHORTCUTS[id];
  const override = overrides[id];

  if (!override) {
    return defaultShortcut;
  }

  return {
    ...defaultShortcut,
    key: override.key,
    modifiers: override.modifiers,
  };
}

export function getActiveShortcuts(
  overrides: ShortcutOverrides = {},
): Record<ShortcutId, ShortcutDefinition> {
  const result = {} as Record<ShortcutId, ShortcutDefinition>;

  for (const id of Object.keys(SHORTCUTS) as ShortcutId[]) {
    result[id] = getActiveShortcut(id, overrides);
  }

  return result;
}

export function isBrowserReserved(key: string, modifiers: ShortcutModifiers): boolean {
  const str = shortcutToString(key, modifiers);
  return BROWSER_RESERVED_SHORTCUTS.has(str);
}

export function findConflict(
  key: string,
  modifiers: ShortcutModifiers,
  excludeId: ShortcutId,
  overrides: ShortcutOverrides = {},
): ShortcutId | null {
  const newStr = shortcutToString(key, modifiers);

  for (const id of Object.keys(SHORTCUTS) as ShortcutId[]) {
    if (id === excludeId) continue;

    const active = getActiveShortcut(id, overrides);
    const activeStr = shortcutToString(active.key, active.modifiers ?? {});

    if (newStr === activeStr) {
      return id;
    }
  }

  return null;
}

export function parseShortcutInput(
  input: string,
): { key: string; modifiers: ShortcutModifiers } | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  const parts = normalized.split(/[+\s]+/);
  const modifiers: ShortcutModifiers = {};
  let key = "";

  for (const part of parts) {
    switch (part) {
      case "meta":
      case "cmd":
      case "command":
      case "ctrl":
      case "control":
        modifiers.meta = true;
        break;
      case "shift":
        modifiers.shift = true;
        break;
      case "alt":
      case "option":
        modifiers.alt = true;
        break;
      default:
        key = part;
    }
  }

  if (!key) return null;

  return { key, modifiers };
}
