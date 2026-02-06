// Polyfill for modulepreload in older browsers.
// Required for Vite backend integration.
// https://vitejs.dev/guide/backend-integration.html
import "vite/modulepreload-polyfill";

import { createRoot } from "react-dom/client";

import { AppProviders } from "./app/providers/app-providers";

import "./styles/index.css";

async function startMsw(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MSW !== "true") {
    return;
  }

  const { worker } = await import("./mocks/browser");
  // biome-ignore lint/nursery/useAwaitThenable: worker.start returns Promise.
  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

/**
 * Safely mounts the React application to the DOM.
 * Handles the case where the root element might not exist.
 */
function mountApp(): void {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error(
      "Root element with id 'root' not found. " +
        'Ensure your HTML contains <div id="root"></div>.',
    );
    return;
  }

  createRoot(rootElement).render(<AppProviders />);
}

// Mount the application.
startMsw()
  .catch((error) => {
    console.error("Failed to start MSW.", error);
  })
  .finally(() => {
    mountApp();
  });
