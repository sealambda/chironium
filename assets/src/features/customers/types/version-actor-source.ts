/**
 * Minimal shape of a versioned record's actor fields. Kept in its own leaf module so the
 * per-domain API modules (anthropometry, food-preferences, …) can reference it without
 * importing the activity-feed hub — which imports back from those APIs and would otherwise
 * form a dependency cycle.
 */
export interface VersionActorSource {
  changedBy?: { id: string; name?: string | null } | null;
  changedByPractitioner?: {
    id: string;
    name?: ReadonlyArray<{
      text?: string | null;
      given?: readonly string[] | null;
      family?: string | null;
    }> | null;
  } | null;
}
