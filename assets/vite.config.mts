import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { resolve } from "node:path";

/**
 * Vite plugin for integration with the Phoenix ecosystem.
 *
 * - Delegates update behavior for Elixir files/templates to phoenix_live_view.
 *   Vite plugins like Tailwind can set up dependencies in Vite's module graph
 *   on Elixir files. Updating those files makes Vite do a full page reload.
 *   This plugin stops that reload and only hot updates dependants of the file.
 *   phoenix_live_reload can then handle any further behavior based on Elixir
 *   files changing.
 *
 * - Makes sure Vite closes when STDIN is closed to work properly as a port.
 *
 * @param opts - Options for the plugin.
 * @returns The Vite plugin.
 */
function phoenixVitePlugin(opts: { pattern?: RegExp } = {}): Plugin {
  return {
    name: "phoenix-vite",
    handleHotUpdate({ file, modules }) {
      if (!opts.pattern || !file.match(opts.pattern)) {
        return;
      }
      // Replace current file module with importers, keep the rest.
      return [...modules].flatMap((mod) => {
        if (mod.file === file) {
          return [...mod.importers];
        }
        return [mod];
      });
    },
    configureServer() {
      // Make Vite correctly detect stdin being closed.
      process.stdin.resume();
    },
  };
}

const mixEnv = process.env.MIX_ENV ?? "dev";
const mixBuildPath = process.env.MIX_BUILD_PATH ?? resolve(__dirname, "../_build", mixEnv);
const isDev = mixEnv === "dev";

export default defineConfig({
  // Development server configuration.
  // Note: The app is always accessed via Phoenix (localhost:4000), not directly
  // through Vite. This server config is only for HMR and asset serving.
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    origin: "http://localhost:5173",
    cors: { origin: "http://localhost:4000" },
  },
  // Pre-bundle Phoenix dependencies for faster dev startup.
  optimizeDeps: {
    // https://vitejs.dev/guide/dep-pre-bundling#monorepos-and-linked-dependencies
    include: ["phoenix", "phoenix_html", "phoenix_live_view"],
  },
  // Production build configuration.
  build: {
    // Generate .vite/manifest.json for backend integration.
    manifest: true,
    rollupOptions: {
      // Entry points for phoenix_vite manifest integration.
      // CSS is listed separately for PhoenixVite.Components.assets to generate correct link tags.
      input: ["js/app.js", "css/app.css", "src/main.tsx"],
      output: {
        // Vendor chunk for better caching.
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["@tanstack/react-router"],
          query: ["@tanstack/react-query"],
        },
      },
    },
    outDir: "../priv/static",
    emptyOutDir: true,
    // Source maps: inline in dev for debugging, disabled in prod for security.
    // Set VITE_SOURCEMAP=true in production if you need debugging.
    sourcemap: isDev ? "inline" : process.env.VITE_SOURCEMAP === "true",
    // Inline assets smaller than 4KB.
    assetsInlineLimit: 4096,
    // Target modern browsers for smaller bundle size.
    target: "es2022",
    // Minify in production.
    minify: !isDev,
    // Split CSS into separate files for better caching.
    cssCodeSplit: true,
    // Skip reporting compressed size for faster builds.
    reportCompressedSize: false,
  },
  // Public directory for static assets (favicon, robots.txt, etc.).
  publicDir: "public",
  // LV Colocated JS and Hooks.
  // https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.ColocatedJS.html#module-internals
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "phoenix-colocated": `${mixBuildPath}/phoenix-colocated`,
    },
  },
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      emitTsDeclarations: true,
      // Resolve order: persisted user choice → browser language → English fallback.
      // The cookie is written by the language toggle, so manual overrides always win.
      // preferredLanguage reads navigator.languages and matches "es*" → es, anything else → falls through to baseLocale.
      // globalVariable is intentionally excluded: it is testing-only and doesn't persist across page reloads.
      strategy: ["cookie", "preferredLanguage", "baseLocale"],
    }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    phoenixVitePlugin({ pattern: /\.(ex|heex)$/ }),
  ],
});
