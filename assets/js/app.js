// Polyfill for modulepreload in older browsers.
import "vite/modulepreload-polyfill";

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import { hooks as colocatedHooks } from "phoenix-colocated/chironium";
import topbar from "topbar";

/**
 * Safely retrieves the CSRF token from the meta tag.
 * @returns {string} The CSRF token string or empty string if not found.
 */
function getCsrfToken() {
  const metaTag = document.querySelector("meta[name='csrf-token']");
  if (!metaTag) {
    console.error("CSRF token meta tag not found. LiveView forms may not work.");
    return "";
  }
  return metaTag.getAttribute("content") ?? "";
}

const csrfToken = getCsrfToken();
const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken },
  hooks: { ...colocatedHooks },
});

// Show progress bar on live navigation and form submits.
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", () => topbar.show(300));
window.addEventListener("phx:page-loading-stop", () => topbar.hide());

// Connect if there are any LiveViews on the page.
liveSocket.connect();

// Expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket;

// Development features: server log streaming and click-to-source navigation.
if (import.meta.env.DEV) {
  window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
    // Enable server log streaming to client.
    reloader.enableServerLogs();

    // Open configured PLUG_EDITOR at file:line of the clicked element's HEEx component.
    // Click with "c" key pressed to open at caller location.
    // Click with "d" key pressed to open at function component definition location.
    let keyDown = null;
    window.addEventListener("keydown", (e) => {
      keyDown = e.key;
    });
    window.addEventListener("keyup", () => {
      keyDown = null;
    });
    window.addEventListener(
      "click",
      (e) => {
        if (keyDown === "c") {
          e.preventDefault();
          e.stopImmediatePropagation();
          reloader.openEditorAtCaller(e.target);
        } else if (keyDown === "d") {
          e.preventDefault();
          e.stopImmediatePropagation();
          reloader.openEditorAtDef(e.target);
        }
      },
      true,
    );

    window.liveReloader = reloader;
  });
}
