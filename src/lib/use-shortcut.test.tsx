// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHORTCUTS } from "./shortcuts";
import { usePlatform, useShortcut, useShortcuts } from "./use-shortcut";

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

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when wrong key is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler));

    const event = new KeyboardEvent("keydown", {
      key: "j",
      metaKey: true,
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call handler when modifier is missing", () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(SHORTCUTS.COMMAND_PALETTE, handler));

    const event = new KeyboardEvent("keydown", {
      key: "k",
    });

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

    const event = new KeyboardEvent("keydown", {
      key: "k",
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

    const event1 = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });
    Object.defineProperty(event1, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event1);
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();

    const event2 = new KeyboardEvent("keydown", {
      key: "n",
      metaKey: true,
    });
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

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });
});
