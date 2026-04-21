const PERSON_FILTER_PREFERENCE_KEY = "chironium_customer_assignment_filter";

interface StoredPractitionerFilter {
  kind: "practitioner";
  id: string;
  name: string;
}

interface StoredUnassignedFilter {
  kind: "unassigned";
}

export type StoredPersonFilter = StoredPractitionerFilter | StoredUnassignedFilter | null;

export function getStoredPersonFilterPreference(): StoredPersonFilter {
  try {
    const stored = localStorage.getItem(PERSON_FILTER_PREFERENCE_KEY);
    if (!stored) {
      return null;
    }

    const parsed: StoredPersonFilter = JSON.parse(stored);
    if (parsed === null) {
      return null;
    }

    if (parsed.kind === "unassigned") {
      return { kind: "unassigned" };
    }

    if (
      parsed.kind === "practitioner" &&
      typeof parsed.id === "string" &&
      typeof parsed.name === "string"
    ) {
      return {
        kind: "practitioner",
        id: parsed.id,
        name: parsed.name,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function storePersonFilterPreference(filter: StoredPersonFilter): void {
  try {
    if (!filter) {
      localStorage.removeItem(PERSON_FILTER_PREFERENCE_KEY);
      return;
    }

    localStorage.setItem(PERSON_FILTER_PREFERENCE_KEY, JSON.stringify(filter));
  } catch {
    // localStorage not available.
  }
}
