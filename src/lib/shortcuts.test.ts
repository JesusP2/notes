import { describe, expect, it } from "vitest";
import {
  formatShortcut,
  getShortcutsByCategory,
  getShortcutsByScope,
  matchesShortcut,
  SHORTCUTS,
  type ShortcutDefinition,
} from "./shortcuts";

describe("formatShortcut", () => {
  it("formats meta shortcut for mac", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    expect(formatShortcut(shortcut, "mac")).toBe("⌘K");
  });

  it("formats meta shortcut for other platforms", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    expect(formatShortcut(shortcut, "other")).toBe("Ctrl+K");
  });

  it("formats meta+shift shortcut for mac", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "n",
      modifiers: { meta: true, shift: true },
      description: "Test",
      scope: "global",
      category: "notes",
    };
    expect(formatShortcut(shortcut, "mac")).toBe("⌘⇧N");
  });

  it("formats meta+shift shortcut for other platforms", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "n",
      modifiers: { meta: true, shift: true },
      description: "Test",
      scope: "global",
      category: "notes",
    };
    expect(formatShortcut(shortcut, "other")).toBe("Ctrl+Shift+N");
  });

  it("formats special keys like Backspace", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "Backspace",
      modifiers: { meta: true },
      description: "Test",
      scope: "editor",
      category: "editor",
    };
    expect(formatShortcut(shortcut, "mac")).toBe("⌘⌫");
    expect(formatShortcut(shortcut, "other")).toBe("Ctrl+Backspace");
  });

  it("formats alt modifier", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "x",
      modifiers: { meta: true, alt: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    expect(formatShortcut(shortcut, "mac")).toBe("⌘⌥X");
    expect(formatShortcut(shortcut, "other")).toBe("Ctrl+Alt+X");
  });

  it("defaults to mac platform", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    expect(formatShortcut(shortcut)).toBe("⌘K");
  });
});

describe("matchesShortcut", () => {
  function createKeyboardEvent(options: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  }): KeyboardEvent {
    return {
      key: options.key,
      metaKey: options.metaKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
    } as KeyboardEvent;
  }

  it("matches meta+key with metaKey", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    const event = createKeyboardEvent({ key: "k", metaKey: true });
    expect(matchesShortcut(event, shortcut)).toBe(true);
  });

  it("matches meta+key with ctrlKey for cross-platform support", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    const event = createKeyboardEvent({ key: "k", ctrlKey: true });
    expect(matchesShortcut(event, shortcut)).toBe(true);
  });

  it("does not match when key is different", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    const event = createKeyboardEvent({ key: "j", metaKey: true });
    expect(matchesShortcut(event, shortcut)).toBe(false);
  });

  it("does not match when modifier is missing", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    const event = createKeyboardEvent({ key: "k" });
    expect(matchesShortcut(event, shortcut)).toBe(false);
  });

  it("matches meta+shift+key", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "n",
      modifiers: { meta: true, shift: true },
      description: "Test",
      scope: "global",
      category: "notes",
    };
    const event = createKeyboardEvent({ key: "n", metaKey: true, shiftKey: true });
    expect(matchesShortcut(event, shortcut)).toBe(true);
  });

  it("does not match meta+key when shift is also pressed but not required", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "k",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    const event = createKeyboardEvent({ key: "k", metaKey: true, shiftKey: true });
    expect(matchesShortcut(event, shortcut)).toBe(false);
  });

  it("matches case-insensitively", () => {
    const shortcut: ShortcutDefinition = {
      id: "test",
      key: "K",
      modifiers: { meta: true },
      description: "Test",
      scope: "global",
      category: "navigation",
    };
    const event = createKeyboardEvent({ key: "k", metaKey: true });
    expect(matchesShortcut(event, shortcut)).toBe(true);
  });
});

describe("getShortcutsByCategory", () => {
  it("returns shortcuts grouped by category", () => {
    const categories = getShortcutsByCategory();

    expect(categories.has("navigation")).toBe(true);
    expect(categories.has("notes")).toBe(true);
    expect(categories.has("editor")).toBe(true);
    expect(categories.has("view")).toBe(true);
    expect(categories.has("help")).toBe(true);

    const navigationShortcuts = categories.get("navigation");
    expect(navigationShortcuts).toBeDefined();
    expect(navigationShortcuts!.some((s) => s.id === "command-palette")).toBe(true);
  });
});

describe("getShortcutsByScope", () => {
  it("returns only global shortcuts", () => {
    const globalShortcuts = getShortcutsByScope("global");
    expect(globalShortcuts.every((s) => s.scope === "global")).toBe(true);
    expect(globalShortcuts.some((s) => s.id === "command-palette")).toBe(true);
  });

  it("returns only editor shortcuts", () => {
    const editorShortcuts = getShortcutsByScope("editor");
    expect(editorShortcuts.every((s) => s.scope === "editor")).toBe(true);
    expect(editorShortcuts.some((s) => s.id === "note-details")).toBe(true);
  });
});

describe("SHORTCUTS constant", () => {
  it("has all required shortcuts defined", () => {
    expect(SHORTCUTS.COMMAND_PALETTE).toBeDefined();
    expect(SHORTCUTS.NEW_NOTE).toBeDefined();
    expect(SHORTCUTS.NEW_TAG).toBeDefined();
    expect(SHORTCUTS.TOGGLE_SIDEBAR).toBeDefined();
    expect(SHORTCUTS.TOGGLE_THEME).toBeDefined();
    expect(SHORTCUTS.NOTE_DETAILS).toBeDefined();
    expect(SHORTCUTS.LINK_TO).toBeDefined();
    expect(SHORTCUTS.DELETE_NOTE).toBeDefined();
    expect(SHORTCUTS.SHOW_SHORTCUTS).toBeDefined();
  });
});
