export type ShortcutScope = "global" | "editor" | "dialog";
export type ShortcutCategory = "navigation" | "notes" | "editor" | "view" | "help";

export interface ShortcutModifiers {
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutDefinition {
  id: string;
  key: string;
  modifiers?: ShortcutModifiers;
  description: string;
  scope: ShortcutScope;
  category: ShortcutCategory;
}

export const SHORTCUTS = {
  COMMAND_PALETTE: {
    id: "command-palette",
    key: "k",
    modifiers: { meta: true },
    description: "Open command palette",
    scope: "global",
    category: "navigation",
  },
  GRAPH_VIEW: {
    id: "graph-view",
    key: "g",
    modifiers: { meta: true },
    description: "Go to graph view",
    scope: "global",
    category: "navigation",
  },
  GO_HOME: {
    id: "go-home",
    key: "h",
    modifiers: { meta: true, shift: true },
    description: "Go home",
    scope: "global",
    category: "navigation",
  },

  NEW_NOTE: {
    id: "new-note",
    key: "n",
    modifiers: { meta: true },
    description: "Create new note",
    scope: "global",
    category: "notes",
  },
  NEW_TAG: {
    id: "new-tag",
    key: "n",
    modifiers: { meta: true, shift: true },
    description: "Create new tag",
    scope: "global",
    category: "notes",
  },

  NOTE_DETAILS: {
    id: "note-details",
    key: "i",
    modifiers: { meta: true },
    description: "Open note details",
    scope: "editor",
    category: "editor",
  },
  LINK_TO: {
    id: "link-to",
    key: "l",
    modifiers: { meta: true },
    description: "Link to another note",
    scope: "editor",
    category: "editor",
  },
  DELETE_NOTE: {
    id: "delete-note",
    key: "Backspace",
    modifiers: { meta: true },
    description: "Delete note",
    scope: "editor",
    category: "editor",
  },
  SAVE_NOW: {
    id: "save-now",
    key: "s",
    modifiers: { meta: true },
    description: "Save immediately",
    scope: "editor",
    category: "editor",
  },

  TOGGLE_SIDEBAR: {
    id: "toggle-sidebar",
    key: "b",
    modifiers: { meta: true },
    description: "Toggle sidebar",
    scope: "global",
    category: "view",
  },
  TOGGLE_THEME: {
    id: "toggle-theme",
    key: "j",
    modifiers: { meta: true },
    description: "Toggle dark/light mode",
    scope: "global",
    category: "view",
  },

  SHOW_SHORTCUTS: {
    id: "show-shortcuts",
    key: "/",
    modifiers: { meta: true },
    description: "Show keyboard shortcuts",
    scope: "global",
    category: "help",
  },
} as const satisfies Record<string, ShortcutDefinition>;

export type ShortcutId = keyof typeof SHORTCUTS;

export function formatShortcut(
  shortcut: ShortcutDefinition,
  platform: "mac" | "other" = "mac",
): string {
  const parts: string[] = [];

  if (shortcut.modifiers?.meta) {
    parts.push(platform === "mac" ? "⌘" : "Ctrl");
  }
  if (shortcut.modifiers?.shift) {
    parts.push(platform === "mac" ? "⇧" : "Shift");
  }
  if (shortcut.modifiers?.alt) {
    parts.push(platform === "mac" ? "⌥" : "Alt");
  }

  const keyDisplay = formatKey(shortcut.key, platform);
  parts.push(keyDisplay);

  return platform === "mac" ? parts.join("") : parts.join("+");
}

function formatKey(key: string, platform: "mac" | "other"): string {
  const keyMap: Record<string, { mac: string; other: string }> = {
    Backspace: { mac: "⌫", other: "Backspace" },
    Delete: { mac: "⌦", other: "Del" },
    Enter: { mac: "↵", other: "Enter" },
    Escape: { mac: "⎋", other: "Esc" },
    ArrowUp: { mac: "↑", other: "↑" },
    ArrowDown: { mac: "↓", other: "↓" },
    ArrowLeft: { mac: "←", other: "←" },
    ArrowRight: { mac: "→", other: "→" },
    " ": { mac: "Space", other: "Space" },
  };

  if (keyMap[key]) {
    return keyMap[key][platform];
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}

export function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDefinition): boolean {
  const eventKey = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  if (eventKey !== shortcutKey) {
    return false;
  }

  const meta = shortcut.modifiers?.meta ?? false;
  const shift = shortcut.modifiers?.shift ?? false;
  const alt = shortcut.modifiers?.alt ?? false;

  // metaKey is ⌘ on Mac, ctrlKey on Windows/Linux - check both for cross-platform support
  const metaPressed = event.metaKey || event.ctrlKey;

  if (meta !== metaPressed) {
    return false;
  }
  if (shift !== event.shiftKey) {
    return false;
  }
  if (alt !== event.altKey) {
    return false;
  }

  return true;
}

export function getShortcutsByCategory(): Map<ShortcutCategory, ShortcutDefinition[]> {
  const categories = new Map<ShortcutCategory, ShortcutDefinition[]>();

  for (const shortcut of Object.values(SHORTCUTS)) {
    const existing = categories.get(shortcut.category) ?? [];
    existing.push(shortcut);
    categories.set(shortcut.category, existing);
  }

  return categories;
}

export function getShortcutsByScope(scope: ShortcutScope): ShortcutDefinition[] {
  return Object.values(SHORTCUTS).filter((s) => s.scope === scope);
}

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: "Navigation",
  notes: "Notes",
  editor: "Editor",
  view: "View",
  help: "Help",
};
