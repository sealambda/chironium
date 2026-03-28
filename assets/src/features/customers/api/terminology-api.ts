import { graphql, type ResultOf } from "@/graphql";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const SearchConceptsQuery = graphql(`
  query SearchConceptsForTags(
    $text: String!
    $first: Int
    $languages: [String!]
    $context: ConceptContext
  ) {
    searchConcepts(text: $text, first: $first, context: $context) {
      results {
        code
        codeSystem {
          url
          version
        }
        designations(
          limit: 20
          filter: { language: { in: $languages }, use: { in: ["display", "synonym", "consumer"] } }
        ) {
          language
          use
          value
        }
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

export interface TerminologySuggestion {
  label: string;
  system: string;
  code: string;
  version?: string | null;
}

/** Matches GraphQL `ConceptContext` — scopes concept search to a clinical hierarchy. */
export type ConceptSearchContext =
  | "ALLERGY_INTOLERANCE"
  | "CONDITION"
  | "FOOD"
  | "LAB_RESULT"
  | "MEDICATION";

type SearchConceptsForTagsResult = ResultOf<typeof SearchConceptsQuery>;

/** One concept row returned inside `searchConcepts.results`. */
type SearchConceptRow = NonNullable<
  NonNullable<SearchConceptsForTagsResult["searchConcepts"]>["results"]
>[number];

type SearchConceptDesignation = NonNullable<NonNullable<SearchConceptRow["designations"]>>[number];

function normalizeLocale(locale: string): string {
  return locale.trim().toLowerCase();
}

export async function searchTerminologySuggestions(
  text: string,
  locale: string,
  organizationId: string,
  context: ConceptSearchContext,
): Promise<TerminologySuggestion[]> {
  const term = text.trim();
  if (term.length < 2 || !organizationId) {
    return [];
  }

  const language = normalizeLocale(locale);
  const result = await requestGraphql<SearchConceptsForTagsResult>({
    document: SearchConceptsQuery,
    variables: {
      text: term,
      first: 8,
      languages: [language],
      context,
    },
    organizationId,
  });

  return (result.searchConcepts?.results ?? []).flatMap((concept: SearchConceptRow) => {
    const designationSuggestions = (concept.designations ?? []).map(
      (designation: SearchConceptDesignation) => ({
        label: designation.value,
        system: concept.codeSystem.url,
        code: concept.code,
        version: concept.codeSystem.version ?? null,
      }),
    );

    if (designationSuggestions.length > 0) {
      return designationSuggestions;
    }

    return [
      {
        label: concept.code,
        system: concept.codeSystem.url,
        code: concept.code,
        version: concept.codeSystem.version ?? null,
      },
    ];
  });
}
