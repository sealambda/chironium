const ORG_PREFERENCE_KEY = "chironium_preferred_org_id";

export function getStoredPreference(): string | null {
  try {
    return localStorage.getItem(ORG_PREFERENCE_KEY);
  } catch {
    return null;
  }
}

export function storePreference(orgId: string | null): void {
  try {
    if (orgId) {
      localStorage.setItem(ORG_PREFERENCE_KEY, orgId);
    } else {
      localStorage.removeItem(ORG_PREFERENCE_KEY);
    }
  } catch {
    // localStorage not available.
  }
}
