import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Documents ───────────────────────────────────────────────────────

const RequestQuestionnaireMutation = graphql(`
  mutation RequestQuestionnaire($input: RequestQuestionnaireInput!) {
    requestQuestionnaire(input: $input) {
      result {
        id
        accessExpiresAt
        focusQuestionnaire {
          id
          title
        }
      }
      metadata {
        linkUrl
        emailSent
      }
      errors {
        message
      }
    }
  }
`);

const ReissueQuestionnaireLinkMutation = graphql(`
  mutation ReissueQuestionnaireLink($id: ID!) {
    reissueQuestionnaireLink(id: $id) {
      result {
        id
        accessExpiresAt
        focusQuestionnaire {
          id
          title
        }
      }
      metadata {
        linkUrl
        emailSent
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** A freshly issued single-use link for a questionnaire request. */
export interface QuestionnaireLink {
  taskId: string;
  url: string;
  emailSent: boolean;
  /** When the link, and any session opened with it, stops working. */
  expiresAt: string | null;
  questionnaireTitle: string | null;
}

export interface RequestQuestionnaireParams {
  organizationId: string;
  patientId: string;
  questionnaireId: string;
  /** A `YYYY-MM-DD` date. */
  dueDate?: string;
  message?: string;
}

type LinkPayload =
  | ResultOf<typeof RequestQuestionnaireMutation>["requestQuestionnaire"]
  | ResultOf<typeof ReissueQuestionnaireLinkMutation>["reissueQuestionnaireLink"];

// ─── Helpers ─────────────────────────────────────────────────────────

function toQuestionnaireLink(payload: LinkPayload, fallbackMessage: string): QuestionnaireLink {
  const task = unwrapMutationResult(payload, fallbackMessage);
  // Metadata sits beside the result, so a missing link must be checked on its own.
  const metadata = payload.metadata;
  if (!metadata) {
    throw new Error(`${fallbackMessage} The server returned no link for task ${task.id}.`);
  }

  return {
    taskId: task.id,
    url: metadata.linkUrl,
    emailSent: metadata.emailSent,
    expiresAt: task.accessExpiresAt,
    questionnaireTitle: task.focusQuestionnaire?.title ?? null,
  };
}

// ─── Functions ───────────────────────────────────────────────────────

/** Send a questionnaire to a patient and return its single-use link. */
export async function requestQuestionnaire({
  organizationId,
  patientId,
  questionnaireId,
  dueDate,
  message,
}: RequestQuestionnaireParams): Promise<QuestionnaireLink> {
  const trimmedMessage = message?.trim();
  const result = await requestGraphql({
    document: RequestQuestionnaireMutation,
    variables: {
      input: {
        patientId,
        questionnaireId,
        ...(dueDate ? { dueDate } : {}),
        ...(trimmedMessage ? { message: trimmedMessage } : {}),
      },
    },
    organizationId,
  });

  return toQuestionnaireLink(result.requestQuestionnaire, "Failed to send the questionnaire.");
}

/** Revoke an open request's links and return a new one with a fresh expiry. */
export async function reissueQuestionnaireLink(
  taskId: string,
  organizationId: string,
): Promise<QuestionnaireLink> {
  const result = await requestGraphql({
    document: ReissueQuestionnaireLinkMutation,
    variables: { id: taskId },
    organizationId,
  });

  return toQuestionnaireLink(
    result.reissueQuestionnaireLink,
    `Failed to issue a new link for questionnaire request ${taskId}.`,
  );
}
