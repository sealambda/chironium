/**
 * Generate initials from a full name.
 * Uses first letter of first word and last word.
 * @example "John Smith" -> "JS", "Maria" -> "MM", "" -> "?"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const firstInitial = parts[0][0] || "";
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] || "" : "";
  return `${firstInitial}${lastInitial || firstInitial}`.toUpperCase();
}

/**
 * Generate initials from an email address.
 * Splits the local part (before @) by common separators (., _, -).
 * @example "john.smith@example.com" -> "JS", "johndoe@example.com" -> "J"
 */
export function getInitialsFromEmail(email: string): string {
  const localPart = email.split("@")[0];
  const parts = localPart.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0][0]) {
    return parts[0][0].toUpperCase();
  }
  return "?";
}
