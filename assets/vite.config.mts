import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { phoenixVitePlugin } from "phoenix_vite";
import { defineConfig } from "vite";

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
