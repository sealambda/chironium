import { CODES } from "@/features/customers/api/observations-api.queries";
import type {
  MenstrualCycleSummary,
  ObservationItem,
} from "@/features/customers/api/observations-api.types";
import { isoToDateInput } from "@/shared/utils/date-time-input";

export function isLegacyMenstrualCycleObservation(item: ObservationItem): boolean {
  return item.code?.coding?.some((coding) => coding.code === CODES.menstrualCycle) ?? false;
}

export function newestFirst<T extends { effectiveDateTime?: string | null }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) =>
    (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? ""),
  );
}

export function parseMenstrualCycleSummary(rawText: string): MenstrualCycleSummary {
  const fields = rawText.split("|");

  let startDate: string | null = null;
  let endDate: string | null = null;
  let notes: string | null = null;

  for (const field of fields) {
    const trimmed = field.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith("start:")) {
      const value = trimmed.slice("start:".length).trim();
      startDate = value || null;
      continue;
    }
    if (trimmed.startsWith("end:")) {
      const value = trimmed.slice("end:".length).trim();
      endDate = value || null;
      continue;
    }
    if (trimmed.startsWith("notes:")) {
      const value = trimmed.slice("notes:".length).trim();
      notes = value || null;
    }
  }

  return { startDate, endDate, durationDays: null, notes };
}

function toDateOnly(value: string | null | undefined): string | null {
  const date = isoToDateInput(value);
  return date || null;
}

function parseDurationDays(value: string | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const durationDays = Number.parseInt(String(value), 10);
  return Number.isFinite(durationDays) ? durationDays : null;
}

function addInclusiveDuration(startDate: string, durationDays: number): string | null {
  if (durationDays < 1) {
    return null;
  }

  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + durationDays - 1);
  return date.toISOString().slice(0, 10);
}

function firstNoteText(
  ...records: Array<{ note?: readonly { text?: string | null }[] | null } | null | undefined>
): string | null {
  for (const record of records) {
    const text = record?.note?.find((note) => note.text?.trim())?.text?.trim();
    if (text) {
      return text;
    }
  }
  return null;
}

function firstNoteSource(
  ...records: Array<{ note?: ObservationItem["note"] | null } | null | undefined>
): ObservationItem["note"] | null {
  for (const record of records) {
    if (record?.note?.length) {
      return record.note;
    }
  }
  return null;
}

export function summarizeFirstClassMenstrualCycle(
  starts: readonly ObservationItem[],
  durations: readonly ObservationItem[],
): MenstrualCycleSummary | null {
  const startRecord = starts[0];
  if (!startRecord) {
    return null;
  }
  return summarizeMenstrualCycleStart(startRecord, durations);
}

export function summarizeMenstrualCycleStart(
  startRecord: ObservationItem,
  durations: readonly ObservationItem[],
): MenstrualCycleSummary | null {
  const startDate = toDateOnly(startRecord.valueDateTime ?? startRecord.effectiveDateTime);
  if (!startDate) {
    return null;
  }

  const matchingDuration = durations.find(
    (record) => toDateOnly(record.effectiveDateTime) === startDate,
  );
  const durationDays = parseDurationDays(matchingDuration?.valueQuantity?.value);

  return {
    startDate,
    endDate: durationDays == null ? null : addInclusiveDuration(startDate, durationDays),
    durationDays,
    notes: firstNoteText(startRecord, matchingDuration),
    startObservationId: startRecord.id,
    durationObservationId: matchingDuration?.id ?? null,
    sourceNotes: firstNoteSource(startRecord, matchingDuration),
    paperTrailVersions: startRecord.paperTrailVersions ?? matchingDuration?.paperTrailVersions,
    selfReported: startRecord.selfReported === true || matchingDuration?.selfReported === true,
  };
}
