/**
 * Whether the server sends email, from the `chironium:email-enabled` meta tag.
 * Without email, invitations and questionnaires are shared as links only.
 */
export function isEmailEnabled(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const metaTag = document.querySelector("meta[name='chironium:email-enabled']");
  return metaTag?.getAttribute("content") === "true";
}
