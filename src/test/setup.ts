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

vi.mock("@/hooks/use-current-user", () => ({
  DEFAULT_USER_ID: "local",
  ROOT_TAG_ID: "root",
  CurrentUserProvider: ({ children }: { children: React.ReactNode }) => children,
  useCurrentUserId: () => TEST_USER_ID,
  useCurrentUser: () => ({ id: TEST_USER_ID, username: "testuser" }),
}));

afterEach(() => {
  if (typeof document !== "undefined") {
    cleanup();
  }
});
