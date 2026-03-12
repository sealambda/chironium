import {
  personListSortOption,
  type PersonListSortOption,
} from "@/features/customers/api/persons-api";

const PERSON_SORT_PREFERENCE_KEY = "chironium_customer_sort";

export function getStoredPersonSortPreference(): PersonListSortOption | null {
  try {
    const stored = localStorage.getItem(PERSON_SORT_PREFERENCE_KEY);
    if (!stored || !personListSortOption.includes(stored as PersonListSortOption)) {
      return null;
    }

    return stored as PersonListSortOption;
  } catch {
    return null;
  }
}

export function storePersonSortPreference(sort: PersonListSortOption): void {
  try {
    localStorage.setItem(PERSON_SORT_PREFERENCE_KEY, sort);
  } catch {
    // localStorage not available.
  }
}
