import {
  type ResponseItem,
  responseItemsSchema,
} from "@/features/questionnaires/model/questionnaire-schemas";
import { graphql, type ResultOf, type VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Documents ───────────────────────────────────────────────────────

const ListResponsesByPatientQuery = graphql(`
  query ListQuestionnaireResponsesByPatient($subjectId: ID!) {
    listQuestionnaireResponses(
      filter: { subjectId: { eq: $subjectId } }
      sort: [{ field: AUTHORED, order: DESC }]
    ) {
      results {
        id
        status
        authored
        item
        questionnaire {
          id
          title
        }
        author {
          id
          name {
            text
          }
        }
        authorPatient {
          id
        }
        selfReported
      }
    }
  }
`);

const CreateQuestionnaireResponseMutation = graphql(`
  mutation CreateQuestionnaireResponse($input: CreateQuestionnaireResponseInput!) {
    createQuestionnaireResponse(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** A stored response in the patient's history, with its parsed answer tree. */
export type QuestionnaireResponseRecord = NonNullable<
  NonNullable<ResultOf<typeof ListResponsesByPatientQuery>["listQuestionnaireResponses"]>["results"]
>[number];

export type QuestionnaireResponseStatus = QuestionnaireResponseRecord["status"];

type CreateInput = VariablesOf<typeof CreateQuestionnaireResponseMutation>["input"];

// ─── Helpers ─────────────────────────────────────────────────────────

/** Parse a stored answer tree, tolerating an empty/invalid blob. */
export function parseAnswers(item: unknown): ResponseItem[] {
  const parsed = responseItemsSchema.safeParse(item ?? []);
  return parsed.success ? parsed.data : [];
}

// ─── Functions ───────────────────────────────────────────────────────

export async function fetchResponsesByPatient(
  patientId: string,
  organizationId: string,
): Promise<QuestionnaireResponseRecord[]> {
  const result = await requestGraphql<ResultOf<typeof ListResponsesByPatientQuery>>({
    document: ListResponsesByPatientQuery,
    variables: { subjectId: patientId },
    organizationId,
  });
  return result.listQuestionnaireResponses?.results ?? [];
}

/** Submit a completed questionnaire response for a patient. */
export async function submitResponse(
  questionnaireId: string,
  patientId: string,
  answers: ResponseItem[],
  organizationId: string,
): Promise<void> {
  const input: CreateInput = {
    questionnaireId,
    subjectId: patientId,
    status: "COMPLETED",
    // `item` is a typed, recursive input object (`QuestionnaireResponseItemInput`); the
    // answer tree is sent as real nested objects.
    item: answers as CreateInput["item"],
  };

  const result = await requestGraphql<ResultOf<typeof CreateQuestionnaireResponseMutation>>({
    document: CreateQuestionnaireResponseMutation,
    variables: { input },
    organizationId,
  });
  unwrapMutationResult(result.createQuestionnaireResponse, "Failed to submit questionnaire.");
}
