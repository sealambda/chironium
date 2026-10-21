import {
  type QuestionnaireItem,
  questionnaireItemsSchema,
} from "@/features/questionnaires/model/questionnaire-schemas";
import { graphql, type ResultOf, type VariablesOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Documents ───────────────────────────────────────────────────────

const ListQuestionnairesQuery = graphql(`
  query ListQuestionnaires {
    listQuestionnaires(sort: [{ field: DATE, order: DESC }]) {
      results {
        id
        title
        name
        status
        version
        date
        description
      }
    }
  }
`);

const GetQuestionnaireQuery = graphql(`
  query GetQuestionnaire($id: ID!) {
    getQuestionnaire(id: $id) {
      id
      title
      name
      status
      version
      date
      description
      item
    }
  }
`);

const CreateQuestionnaireMutation = graphql(`
  mutation CreateQuestionnaire($input: CreateQuestionnaireInput!) {
    createQuestionnaire(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const UpdateQuestionnaireMutation = graphql(`
  mutation UpdateQuestionnaire($id: ID!, $input: UpdateQuestionnaireInput) {
    updateQuestionnaire(id: $id, input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const DeleteQuestionnaireMutation = graphql(`
  mutation DeleteQuestionnaire($id: ID!) {
    deleteQuestionnaire(id: $id) {
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

/** A row in the questionnaire library list. */
export type QuestionnaireListItem = NonNullable<
  NonNullable<ResultOf<typeof ListQuestionnairesQuery>["listQuestionnaires"]>["results"]
>[number];

/** The GraphQL enum value for a questionnaire's lifecycle status. */
export type QuestionnaireStatus = QuestionnaireListItem["status"];

type GetQuestionnaireResult = NonNullable<
  ResultOf<typeof GetQuestionnaireQuery>["getQuestionnaire"]
>;

/** A questionnaire definition with its parsed item tree. */
export interface QuestionnaireDetail extends Omit<GetQuestionnaireResult, "item"> {
  item: QuestionnaireItem[];
}

/** Editable fields shared by create and update. */
export interface QuestionnaireFormInput {
  title: string;
  status: QuestionnaireStatus;
  version: string;
  description: string;
  item: QuestionnaireItem[];
}

type CreateInput = VariablesOf<typeof CreateQuestionnaireMutation>["input"];

// ─── Helpers ─────────────────────────────────────────────────────────

/** Parse the stored JSON item tree, tolerating an empty/invalid blob. */
function parseItems(item: unknown): QuestionnaireItem[] {
  const parsed = questionnaireItemsSchema.safeParse(item ?? []);
  return parsed.success ? parsed.data : [];
}

function toInput(data: QuestionnaireFormInput): CreateInput {
  return {
    title: data.title.trim(),
    status: data.status,
    version: data.version.trim() || null,
    description: data.description.trim() || null,
    // `item` is a typed, recursive input object (`QuestionnaireItemInput`); the tree is
    // sent as real nested objects. The server normalizes keys and validates it.
    item: data.item as CreateInput["item"],
  };
}

// ─── Functions ───────────────────────────────────────────────────────

export async function fetchQuestionnaires(
  organizationId: string,
): Promise<QuestionnaireListItem[]> {
  const result = await requestGraphql<ResultOf<typeof ListQuestionnairesQuery>>({
    document: ListQuestionnairesQuery,
    variables: {},
    organizationId,
  });
  return result.listQuestionnaires?.results ?? [];
}

export async function fetchQuestionnaire(
  id: string,
  organizationId: string,
): Promise<QuestionnaireDetail | null> {
  const result = await requestGraphql<ResultOf<typeof GetQuestionnaireQuery>>({
    document: GetQuestionnaireQuery,
    variables: { id },
    organizationId,
  });
  const questionnaire = result.getQuestionnaire;
  if (!questionnaire) {
    return null;
  }
  return { ...questionnaire, item: parseItems(questionnaire.item) };
}

export async function createQuestionnaire(
  data: QuestionnaireFormInput,
  organizationId: string,
): Promise<string> {
  const result = await requestGraphql<ResultOf<typeof CreateQuestionnaireMutation>>({
    document: CreateQuestionnaireMutation,
    variables: { input: toInput(data) },
    organizationId,
  });
  const created = unwrapMutationResult(
    result.createQuestionnaire,
    "Failed to create questionnaire.",
  );
  return created.id;
}

export async function updateQuestionnaire(
  id: string,
  data: QuestionnaireFormInput,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql<ResultOf<typeof UpdateQuestionnaireMutation>>({
    document: UpdateQuestionnaireMutation,
    variables: { id, input: toInput(data) },
    organizationId,
  });
  unwrapMutationResult(result.updateQuestionnaire, "Failed to update questionnaire.");
}

export async function deleteQuestionnaire(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql<ResultOf<typeof DeleteQuestionnaireMutation>>({
    document: DeleteQuestionnaireMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteQuestionnaire, "Failed to delete questionnaire.");
}
