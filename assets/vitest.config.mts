import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest uses the React plugin and the same `@/` alias as Vite so imports resolve
 * consistently. Paraglide output under `src/paraglide` is plain TypeScript and does
 * not require the Paraglide Vite plugin in tests.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**"],
    css: false,
    restoreMocks: true,
  },
});
