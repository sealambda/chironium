// TEMPORARY: Remove when backend implements contact mutations

import type { MutationError } from "./mutation-result";

export interface CreateContactInput {
  name: string;
  contactPoints?: Array<{
    type: "EMAIL" | "PHONE" | "INSTAGRAM";
    value: string;
    isPrimary?: boolean;
  }> | null;
}

export interface CreateContactResult {
  result: {
    id: string;
    name?: string | null;
    contactPoints: Array<{
      id: string;
      type?: string | null;
      value?: string | null;
    }>;
  } | null;
  errors: MutationError[];
}
