/**
 * Resolves given and family strings for forms (e.g. practitioner) from User-like profile fields.
 * Prefers explicit `givenName` / `familyName`; otherwise splits `name` on whitespace
 * (first token → given, remainder → family).
 */
export function givenFamilyFromUserProfile(fields: {
  name: string | null | undefined;
  givenName: string | null | undefined;
  familyName: string | null | undefined;
}): { givenName: string; familyName: string } {
  const g = fields.givenName?.trim() ?? "";
  const f = fields.familyName?.trim() ?? "";
  if (g || f) {
    return { givenName: g, familyName: f };
  }
  const full = fields.name?.trim() ?? "";
  if (!full) {
    return { givenName: "", familyName: "" };
  }
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { givenName: "", familyName: "" };
  }
  if (parts.length === 1) {
    return { givenName: parts[0] ?? "", familyName: "" };
  }
  return { givenName: parts[0] ?? "", familyName: parts.slice(1).join(" ") };
}

/**
 * Generate initials from a full name.
 * Uses first letter of first word and last word.
 * @example "John Smith" -> "JS", "Maria" -> "MM", "" -> "?"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const firstInitial = parts[0][0] || "";
  const lastInitial = parts.length > 1 ? parts.at(-1)?.[0] || "" : "";
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

/**
 * Generate user initials from name, falling back to email.
 */
export function getUserInitials(
  name: string | null | undefined,
  email: string | undefined,
): string {
  if (!email) {
    return "?";
  }

  return name ? getInitials(name) : getInitialsFromEmail(email);
}
