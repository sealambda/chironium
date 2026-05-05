/**
 * Activity feed types. Expanded with full feed events in the next PR; this
 * minimal stub exists so anthropometry-api can reference VersionActorSource
 * without depending on the full activity feed module.
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
