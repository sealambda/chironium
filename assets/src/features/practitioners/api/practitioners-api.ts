import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const ListPractitionersQuery = graphql(`
  query ListPractitioners($first: Int, $sort: [PractitionerSortInput]) {
    listPractitioners(first: $first, sort: $sort) {
      results {
        id
        name {
          given
          family
          text
        }
        active
      }
    }
  }
`);

const CreatePractitionerMutation = graphql(`
  mutation CreatePractitioner($input: CreatePractitionerInput!) {
    createPractitioner(input: $input) {
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

export type Practitioner = NonNullable<
  NonNullable<ResultOf<typeof ListPractitionersQuery>["listPractitioners"]>["results"]
>[number];

export interface CreatePractitionerParams {
  givenName: string;
  familyName: string;
  birthDate: string;
}

export type CreatedPractitioner = NonNullable<
  NonNullable<ResultOf<typeof CreatePractitionerMutation>["createPractitioner"]>["result"]
>;

// ─── Functions ───────────────────────────────────────────────────────

function practitionerGivenNameSortKey(name: Practitioner["name"]): string {
  const given = name[0]?.given?.[0] ?? "";
  return given.toLowerCase();
}

/** Stable copy sorted by first given name (A-Z) for display lists (e.g. reassignment picker). */
export function sortPractitionersByGivenNameAsc(items: Practitioner[]): Practitioner[] {
  return [...items].sort((a, b) =>
    practitionerGivenNameSortKey(a.name).localeCompare(practitionerGivenNameSortKey(b.name)),
  );
}

/** Fetches practitioners (newest first). Use {@link sortPractitionersByGivenNameAsc} when the UI needs alphabetical order. */
export async function fetchPractitionersList(organizationId: string): Promise<Practitioner[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: ListPractitionersQuery,
    variables: {
      first: 250,
      sort: [{ field: "ID", order: "DESC" }],
    },
    organizationId,
  });

  return result.listPractitioners?.results ?? [];
}

export async function createPractitioner(
  organizationId: string,
  values: CreatePractitionerParams,
): Promise<CreatedPractitioner> {
  const given = values.givenName.trim();
  const family = values.familyName.trim();
  const text = [given, family].filter(Boolean).join(" ").trim();

  const result = await requestGraphql({
    document: CreatePractitionerMutation,
    variables: {
      input: {
        name: [
          {
            given: given ? [given] : undefined,
            family: family || undefined,
            text: text || undefined,
          },
        ],
        birthDate: values.birthDate.trim() || undefined,
        active: true,
      },
    },
    organizationId,
  });

  return unwrapMutationResult(result.createPractitioner, "Failed to create practitioner.");
}
