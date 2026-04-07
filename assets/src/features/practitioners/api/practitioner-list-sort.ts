import { formatPersonName } from "@/shared/utils/person-utils";

export const practitionerListSortOption = [
  "moreRecent",
  "lessRecent",
  "givenNameAsc",
  "givenNameDesc",
  "familyNameAsc",
  "familyNameDesc",
  "birthDateAsc",
  "birthDateDesc",
] as const;

export type PractitionerListSortOption = (typeof practitionerListSortOption)[number];

/** Minimal shape for client-side ordering (matches list query fields). */
export interface PractitionerSortable {
  name: Array<{ given?: string[] | null; family?: string | null; text?: string | null }>;
  birthDate?: string | null;
}

function getGivenSortKey(p: PractitionerSortable): string {
  const given = p.name[0]?.given?.[0] ?? "";
  return given.toLowerCase();
}

function getFamilySortKey(p: PractitionerSortable): string {
  return (p.name[0]?.family ?? "").toLowerCase();
}

function getBirthSortKey(p: PractitionerSortable): string {
  return p.birthDate ?? "";
}

/**
 * Reorders practitioners. Expects the source list in a stable backend order (e.g. ID DESC).
 */
export function applyPractitionerListSort<T extends PractitionerSortable>(
  items: T[],
  sort: PractitionerListSortOption,
): T[] {
  const next = [...items];

  if (sort === "moreRecent") {
    return next;
  }
  if (sort === "lessRecent") {
    return next.reverse();
  }
  if (sort === "givenNameAsc") {
    return next.sort((a, b) => getGivenSortKey(a).localeCompare(getGivenSortKey(b)));
  }
  if (sort === "givenNameDesc") {
    return next.sort((a, b) => getGivenSortKey(b).localeCompare(getGivenSortKey(a)));
  }
  if (sort === "familyNameAsc") {
    return next.sort((a, b) => getFamilySortKey(a).localeCompare(getFamilySortKey(b)));
  }
  if (sort === "familyNameDesc") {
    return next.sort((a, b) => getFamilySortKey(b).localeCompare(getFamilySortKey(a)));
  }
  if (sort === "birthDateAsc") {
    return next.sort((a, b) => getBirthSortKey(a).localeCompare(getBirthSortKey(b)));
  }
  if (sort === "birthDateDesc") {
    return next.sort((a, b) => getBirthSortKey(b).localeCompare(getBirthSortKey(a)));
  }

  return next.sort((a, b) =>
    formatPersonName(a.name).localeCompare(formatPersonName(b.name), undefined, {
      sensitivity: "base",
    }),
  );
}
