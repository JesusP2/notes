// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHORTCUTS, type ShortcutDefinition } from "./shortcuts";
import { usePlatform, useShortcut, useShortcuts } from "./use-shortcut";

function keyToCode(key: string): string | undefined {
  if (key === "/") return "Slash";
  if (key.length === 1) {
    const upper = key.toUpperCase();
    if (/[A-Z]/.test(upper)) return `Key${upper}`;
    if (/[0-9]/.test(upper)) return `Digit${upper}`;
  }
  return key;
}

function createShortcutEvent(
  shortcut: ShortcutDefinition,
  overrides: Partial<KeyboardEventInit> = {},
) {
  const key = overrides.key ?? shortcut.key;
  return new KeyboardEvent("keydown", {
    key,
    code: overrides.code ?? keyToCode(String(key)),
    metaKey: overrides.metaKey ?? Boolean(shortcut.modifiers?.meta),
    ctrlKey: overrides.ctrlKey ?? false,
    altKey: overrides.altKey ?? Boolean(shortcut.modifiers?.alt),
    shiftKey: overrides.shiftKey ?? Boolean(shortcut.modifiers?.shift),
  });
}

describe("usePlatform", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  it("returns 'mac' for Mac platform", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "MacIntel" },
      writable: true,
    });

    const { result } = renderHook(() => usePlatform());
    expect(result.current).toBe("mac");
  });

  it("returns 'other' for Windows platform", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Win32" },
      writable: true,
    });

    const { result } = renderHook(() => usePlatform());
    expect(result.current).toBe("other");
  });

  it("returns 'other' for Linux platform", () => {
    Object.defineProperty(global, "navigator", {
      value: { platform: "Linux x86_64" },
      writable: true,
    });

    const { result } = renderHook(() => usePlatform());
    expect(result.current).toBe("other");
  });
});

describe("useShortcut", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, "addEventListener");
    removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("registers event listener on mount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("calls handler when shortcut is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler));

    const event = createShortcutEvent(SHORTCUTS.COMMAND_PALETTE);
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when wrong key is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler));

    const event = createShortcutEvent(SHORTCUTS.COMMAND_PALETTE, { key: "j" });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call handler when modifier is missing", () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler));

    const event = createShortcutEvent(SHORTCUTS.COMMAND_PALETTE, { altKey: false });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not register listener when disabled", () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler, { enabled: false }));

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("calls handler with ctrlKey for cross-platform support", () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler));

    const event = createShortcutEvent(SHORTCUTS.COMMAND_PALETTE, {
      metaKey: false,
      ctrlKey: true,
    });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("useShortcuts", () => {
  it("handles multiple shortcuts", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    renderHook(() =>
      useShortcuts([
        { shortcut: SHORTCUTS.COMMAND_PALETTE, handler: handler1 },
        { shortcut: SHORTCUTS.NEW_NOTE, handler: handler2 },
      ]),
    );

    const event1 = createShortcutEvent(SHORTCUTS.COMMAND_PALETTE);
    Object.defineProperty(event1, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event1);
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();

    const event2 = createShortcutEvent(SHORTCUTS.NEW_NOTE);
    Object.defineProperty(event2, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event2);
    });

    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("stops after first match", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    renderHook(() =>
      useShortcuts([
        { shortcut: SHORTCUTS.COMMAND_PALETTE, handler: handler1 },
        { shortcut: SHORTCUTS.COMMAND_PALETTE, handler: handler2 },
      ]),
    );

    const event = createShortcutEvent(SHORTCUTS.COMMAND_PALETTE);
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });
});
