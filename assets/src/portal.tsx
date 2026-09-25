// Polyfill for modulepreload in older browsers.
// Required for Vite backend integration.
// https://vitejs.dev/guide/backend-integration.html
import "vite/modulepreload-polyfill";

import { createRoot } from "react-dom/client";

import { applyDocumentLocale } from "@/portal/portal-locale";
import { PortalProviders } from "@/portal/portal-providers";

import "@/styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" not found.');
}

applyDocumentLocale();
createRoot(rootElement).render(<PortalProviders />);
