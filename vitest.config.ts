import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

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
