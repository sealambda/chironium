/**
 * Deployment settings that Phoenix renders as `<meta>` tags in the root layout.
 * Reading them at runtime keeps one frontend build usable by every deployment.
 */

function readMeta(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const content = document.querySelector(`meta[name='${name}']`)?.getAttribute("content");
  return content || undefined;
}

export const runtimeConfig = {
  posthogKey: readMeta("chironium:posthog-key"),
  posthogHost: readMeta("chironium:posthog-host"),
  sourceCodeUrl: readMeta("chironium:source-code-url"),
  demo: readMeta("chironium:demo") === "true",
} as const;
