import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"cloudflare:workers": path.resolve(__dirname, "src/test/cloudflare-workers.ts"),
		},
	},
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
