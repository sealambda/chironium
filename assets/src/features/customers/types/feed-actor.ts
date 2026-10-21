import type { VersionActorSource } from "@/features/customers/types/version-actor-source";
import * as m from "@/paraglide/messages";

export interface FeedActor {
  name: string;
  id?: string;
  noteAuthorName?: string;
}

function practitionerDisplayName(
  name:
    | ReadonlyArray<{
        text?: string | null;
        given?: readonly string[] | null;
        family?: string | null;
      }>
    | null
    | undefined,
): string | undefined {
  const first = name?.[0];
  if (!first) {
    return undefined;
  }
  const text = first.text?.trim();
  if (text) {
    return text;
  }
  const given = first.given?.join(" ").trim() ?? "";
  const family = first.family?.trim() ?? "";
  const composed = [given, family].filter(Boolean).join(" ").trim();
  return composed || undefined;
}

/** The patient as a feed actor: their name when known, otherwise a generic label. */
export function patientActor(
  patientId: string | undefined,
  patientName: string | null | undefined,
): { name: string; id?: string } {
  return { name: patientName?.trim() || m.activity_actor_patient(), id: patientId };
}

export function actorFromVersions(
  versions: readonly VersionActorSource[] | null | undefined,
  patientName?: string | null,
): { name: string; id?: string } | undefined {
  const version = versions?.[0];
  if (!version) {
    return undefined;
  }
  const practitioner = version.changedByPractitioner;
  const practitionerName = practitionerDisplayName(practitioner?.name);
  if (practitioner && practitionerName) {
    return { name: practitionerName, id: practitioner.id };
  }
  const user = version.changedBy;
  const userName = user?.name?.trim();
  if (user && userName) {
    return { name: userName, id: user.id };
  }
  // Patients change records only through the portal, which has no User or Practitioner.
  const patient = version.changedByPatient;
  if (patient) {
    return patientActor(patient.id, patientName);
  }
  return undefined;
}

export function actorFromNotes(
  notes: ReadonlyArray<{ authorString?: string | null }> | undefined | null,
): { name: string } | undefined {
  const name = notes?.[0]?.authorString?.trim();
  return name ? { name } : undefined;
}

export function mergeFeedActor(
  recorder: { name: string; id?: string } | undefined,
  noteAuthor: { name: string } | undefined,
): FeedActor | undefined {
  if (recorder && noteAuthor) {
    if (recorder.name === noteAuthor.name) {
      return { name: recorder.name, id: recorder.id };
    }
    return {
      name: recorder.name,
      id: recorder.id,
      noteAuthorName: noteAuthor.name,
    };
  }
  if (recorder) {
    return { name: recorder.name, id: recorder.id };
  }
  if (noteAuthor) {
    return { name: noteAuthor.name };
  }
  return undefined;
}

/**
 * Collect all unique actors (by name) from a list, deduplicating based on name.
 * Returns the first occurrence of each unique name.
 */
export function uniqueActors(actors: (FeedActor | undefined)[]): FeedActor[] {
  const seen = new Set<string>();
  const result: FeedActor[] = [];
  for (const actor of actors) {
    if (actor && !seen.has(actor.name)) {
      seen.add(actor.name);
      result.push(actor);
    }
  }
  return result;
}
