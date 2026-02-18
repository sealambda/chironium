// Polyfill for modulepreload in older browsers.
// Required for Vite backend integration.
// https://vitejs.dev/guide/backend-integration.html
import "vite/modulepreload-polyfill";

import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app/providers/app-providers";

import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" not found.');
}

createRoot(rootElement).render(<AppProviders />);
