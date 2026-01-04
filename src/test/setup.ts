import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { TEST_USER_ID } from "./helpers";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

vi.mock("@/hooks/use-current-user", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/use-current-user")>(
    "@/hooks/use-current-user",
  );
  return {
    ...actual,
    useCurrentUserId: () => TEST_USER_ID,
    useCurrentUser: () => ({ id: TEST_USER_ID, username: "testuser" }),
  };
});

afterEach(() => {
  if (typeof document !== "undefined") {
    cleanup();
  }
});
