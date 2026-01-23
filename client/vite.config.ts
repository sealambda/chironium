import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

export default defineConfig({
  plugins: [
    // TanStack Router plugin must come before React plugin.
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Chironium",
        short_name: "Chironium",
        theme_color: "#ffffff",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // API endpoints - these go through the proxy for CORS handling.
      "/api/json": { target: "http://localhost:4000", changeOrigin: true },
      "/gql": { target: "http://localhost:4000", ws: true, changeOrigin: true },
      "/ws/gql": { target: "http://localhost:4000", ws: true, changeOrigin: true },
      "/rpc": { target: "http://localhost:4000", changeOrigin: true },
      // Note: /sign-in, /register, /reset, /sign-out are NOT proxied.
      // Auth pages require full browser navigation to the backend URL (port 4000)
      // because their HTML references backend assets (/assets/js/app.js) that
      // Vite doesn't have. See auth.tsx and route guards for direct redirects.
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
