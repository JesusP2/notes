import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    browser: {
      enabled: process.env.VITEST_BROWSER === "true",
      provider: playwright({}),
      instances: [
        {
          browser: "chromium",
        },
      ],
      headless: true,
    },
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 10000,
  },
});
