import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// * phoenix_vite/assets/js/index.js
//   vendored in for now because of our fork
/// ---
import type { Plugin } from "vite";

interface PluginOptions {
  pattern?: RegExp;
}

/**
 * Vite plugin for integration with the phoenix ecosystem
 *
 * - Delegate update behaviour for elixir files / templates to phoenix_live_view.
 *
 *   Vite plugin like tailwind can setup dependencies in vites module graph
 *   on elixir files.  Updating those files makes vite do to a full page reload.
 *   This plugin stops that reload and only hot updates dependants of the file.
 *   phoenix_live_reload can then handle any further behaviour based on elixir
 *   files changing.
 *
 * - Make sure vite closes when STDIN is closed to properly when being called as a port.
 *
 * @param opts - Options for the plugin.
 * @returns The vite plugin
 */
export function phoenixVitePlugin(opts: PluginOptions = {}): Plugin {
  return {
    name: "phoenix-vite",
    handleHotUpdate({ file, modules }) {
      if (!opts.pattern || !file.match(opts.pattern)) return;
      // replace current file module with importers, keep the rest
      return [...modules].flatMap((mod) => {
        if (mod.file == file) return [...mod.importers];
        return [mod];
      });
    },
    configureServer(_server: any) {
      // make vite correctly detect stdin being closed
      process.stdin.resume();
    },
  };
}
/// ---

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    cors: { origin: "http://localhost:4000" },
  },
  optimizeDeps: {
    // https://vitejs.dev/guide/dep-pre-bundling#monorepos-and-linked-dependencies
    include: ["phoenix", "phoenix_html", "phoenix_live_view"],
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: ["js/app.js", "css/app.css", "src/main.tsx"],
    },
    outDir: "../priv/static",
    emptyOutDir: true,
  },
  // LV Colocated JS and Hooks
  // https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.ColocatedJS.html#module-internals
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "phoenix-colocated": `${process.env.MIX_BUILD_PATH}/phoenix-colocated`,
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    phoenixVitePlugin({ pattern: /\.(ex|heex)$/ }),
  ],
});
