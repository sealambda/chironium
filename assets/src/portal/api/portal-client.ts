import type { TadaPersistedDocumentNode } from "gql.tada";

import { getLocale } from "@/paraglide/runtime";
import { buildHeaders } from "@/shared/utils/request-utils";

/** The guest session is gone: submitted, cancelled, expired or signed out. */
export class PortalSessionError extends Error {
  constructor() {
    super("The portal session has ended.");
    this.name = "PortalSessionError";
  }
}

interface PortalResponse<TResult> {
  data?: TResult | null;
  errors?: { message: string }[];
}

/**
 * Runs a persisted document against `/portal/gql`. Only the document's ID is
 * sent; the server refuses anything that isn't in its manifest.
 */
export async function requestPortal<TResult, TVariables>(
  document: TadaPersistedDocumentNode<TResult, TVariables>,
  variables?: TVariables,
): Promise<TResult> {
  const headers = new Headers(buildHeaders());
  headers.set("x-chironium-locale", getLocale());

  const response = await fetch("/portal/gql", {
    method: "POST",
    credentials: "same-origin",
    headers,
    body: JSON.stringify({ id: document.documentId, variables: variables ?? {} }),
  });

  if (response.status === 401) {
    throw new PortalSessionError();
  }
  if (!response.ok) {
    throw new Error(`Portal request failed with status ${response.status}.`);
  }

  const body = (await response.json()) as PortalResponse<TResult>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join(" "));
  }
  if (!body.data) {
    throw new Error("Portal response contained no data.");
  }
  return body.data;
}
