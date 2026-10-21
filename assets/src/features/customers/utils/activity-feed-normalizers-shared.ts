import type { FeedActor } from "@/features/customers/types/feed-actor";
import {
  actorFromNotes,
  actorFromVersions,
  mergeFeedActor,
  uniqueActors,
} from "@/features/customers/types/feed-actor";
import type { VersionActorSource } from "@/features/customers/types/version-actor-source";

/** The patient's display name, used when the patient made a change themselves. */
export type PatientName = string | null | undefined;

export type Trackable = {
  id: string;
  paperTrailVersions?: VersionActorSource[] | null;
  note?: readonly { authorString?: string | null }[] | null;
};

export function nowIso() {
  return new Date().toISOString();
}

export function bucketByMinute<RecordItem extends Trackable>(
  records: readonly RecordItem[],
  getDate: (record: RecordItem) => string,
  patientName: PatientName,
): { date: string; actors: FeedActor[]; items: RecordItem[] }[] {
  const buckets = new Map<string, { date: string; actors: FeedActor[]; items: RecordItem[] }>();

  for (const record of records) {
    const date = getDate(record);
    const key = date.slice(0, 16);
    const recordActor = mergeFeedActor(
      actorFromVersions(record.paperTrailVersions, patientName),
      actorFromNotes(record.note),
    );
    const existingBucket = buckets.get(key);

    if (existingBucket) {
      existingBucket.items.push(record);
      if (recordActor) {
        existingBucket.actors.push(recordActor);
      }
      continue;
    }

    buckets.set(key, {
      date,
      actors: recordActor ? [recordActor] : [],
      items: [record],
    });
  }

  // Deduplicate actors in each bucket.
  for (const bucket of buckets.values()) {
    bucket.actors = uniqueActors(bucket.actors);
  }

  return Array.from(buckets.values());
}
