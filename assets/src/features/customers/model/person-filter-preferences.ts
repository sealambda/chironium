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

function getPersonFilterPreferenceKey(orgId: string): string {
  return `${PERSON_FILTER_PREFERENCE_KEY}_${orgId}`;
}

export function getStoredPersonFilterPreference(orgId: string): StoredPersonFilter {
  try {
    const key = getPersonFilterPreferenceKey(orgId);
    const stored = localStorage.getItem(key);
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

export function storePersonFilterPreference(orgId: string, filter: StoredPersonFilter): void {
  try {
    const key = getPersonFilterPreferenceKey(orgId);
    if (!filter) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(filter));
  } catch {
    // localStorage not available.
  }
}
