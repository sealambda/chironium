import * as m from "@/paraglide/messages";

export interface HumanName {
  given?: string[] | null;
  family?: string | null;
  text?: string | null;
}

/**
 * Format a HumanName array into a display string.
 * Uses the first name entry's text field, or constructs from given + family.
 */
export function formatPersonName(names: HumanName[] | null | undefined): string {
  const name = names?.[0];
  if (!name) {
    return m.common_unknown();
  }

  if (name.text) {
    return name.text;
  }

  const given = name.given?.join(" ") ?? "";
  const family = name.family ?? "";
  const full = [given, family].filter(Boolean).join(" ");
  return full || m.common_unknown();
}
