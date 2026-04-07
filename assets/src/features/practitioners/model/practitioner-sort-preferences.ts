import {
  type PractitionerListSortOption,
  practitionerListSortOption,
} from "@/features/practitioners/api/practitioner-list-sort";

const PRACTITIONER_SORT_PREFERENCE_KEY = "chironium_practitioner_sort";

export function getStoredPractitionerSortPreference(): PractitionerListSortOption | null {
  try {
    const stored = localStorage.getItem(PRACTITIONER_SORT_PREFERENCE_KEY);
    if (!stored || !practitionerListSortOption.includes(stored as PractitionerListSortOption)) {
      return null;
    }

    return stored as PractitionerListSortOption;
  } catch {
    return null;
  }
}

export function storePractitionerSortPreference(sort: PractitionerListSortOption): void {
  try {
    localStorage.setItem(PRACTITIONER_SORT_PREFERENCE_KEY, sort);
  } catch {
    // localStorage not available.
  }
}
