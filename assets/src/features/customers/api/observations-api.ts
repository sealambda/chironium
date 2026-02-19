import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Mutations ───────────────────────────────────────────────────────

const CreateObservationMutation = graphql(`
  mutation CreateObservation($input: CreateObservationInput!) {
    createObservation(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const SNOMED_SYSTEM = "http://snomed.info/sct" as const;

// ─── Types ───────────────────────────────────────────────────────────

/** Form data for the menstrual cycle onboarding step. */
export interface MenstrualCycleFormData {
  startDate: string;
  endDate: string;
  notes: string;
}

/** Form data for included and excluded foods in the diet step. */
export interface FoodFormData {
  included: string[];
  excluded: string[];
}

/** Title and body of a single clinical note. */
export interface NoteFormData {
  title: string;
  body: string;
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create a menstrual-cycle observation (SNOMED 364307006) combining dates and notes.
 */
export async function createMenstrualCycleObservation(
  data: MenstrualCycleFormData,
  subjectId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  // Structured format for parseability.
  const fields: string[] = [];
  if (data.startDate) {
    fields.push(`start:${data.startDate}`);
  }
  if (data.endDate) {
    fields.push(`end:${data.endDate}`);
  }
  if (data.notes.trim()) {
    fields.push(`notes:${data.notes.trim()}`);
  }
  const noteText = fields.join("|");

  const result = await requestGraphql({
    document: CreateObservationMutation,
    variables: {
      input: {
        status: "FINAL",
        code: { coding: [{ system: SNOMED_SYSTEM, code: "364307006" }] },
        valueString: noteText,
        note: [{ text: noteText, authorReference: userId, time: new Date().toISOString() }],
        subjectId,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createObservation, "Failed to create menstrual cycle observation.");
}

/**
 * Create diet-inclusion and/or diet-exclusion observations. Skips empty values.
 */
export async function createFoodObservations(
  data: FoodFormData,
  subjectId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const promises: Promise<void>[] = [];
  const includedCsv = data.included.filter((s) => s.trim()).join(",");
  const excludedCsv = data.excluded.filter((s) => s.trim()).join(",");

  if (includedCsv) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: CreateObservationMutation,
          variables: {
            input: {
              status: "FINAL",
              code: { text: "diet-inclusion" },
              valueString: includedCsv,
              note: [
                {
                  text: includedCsv,
                  authorReference: userId,
                  time: new Date().toISOString(),
                },
              ],
              subjectId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(result.createObservation, "Failed to create diet inclusion record.");
      })(),
    );
  }

  if (excludedCsv) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: CreateObservationMutation,
          variables: {
            input: {
              status: "FINAL",
              code: { text: "diet-exclusion" },
              valueString: excludedCsv,
              note: [
                {
                  text: excludedCsv,
                  authorReference: userId,
                  time: new Date().toISOString(),
                },
              ],
              subjectId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(result.createObservation, "Failed to create diet exclusion record.");
      })(),
    );
  }

  await Promise.all(promises);
}

/**
 * Create one observation per note. Skips notes where both title and body are empty.
 */
export async function createNoteObservations(
  notes: NoteFormData[],
  subjectId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const validNotes = notes.filter((n) => n.title.trim() || n.body.trim());

  await Promise.all(
    validNotes.map(async (note) => {
      const valueString = note.title.trim()
        ? `${note.title.trim()}: ${note.body.trim()}`
        : note.body.trim();

      const result = await requestGraphql({
        document: CreateObservationMutation,
        variables: {
          input: {
            status: "FINAL",
            code: { text: "clinical-note" },
            valueString,
            note: [{ text: valueString, authorReference: userId, time: new Date().toISOString() }],
            subjectId,
          },
        },
        organizationId,
      });
      unwrapMutationResult(result.createObservation, "Failed to create note observation.");
    }),
  );
}
