import { graphql } from "@/graphql";
import { requestGraphql } from "@/shared/api/graphql";

export interface TerminologySuggestion {
  label: string;
  system: string;
  code: string;
  version?: string | null;
}

const SearchConceptsQuery = graphql(`
  query SearchConceptsForTags($text: String!, $first: Int, $languages: [String!]) {
    searchConcepts(text: $text, first: $first) {
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

function normalizeLocale(locale: string): string {
  return locale.trim().toLowerCase();
}

export async function searchTerminologySuggestions(
  text: string,
  locale: string,
  organizationId: string,
): Promise<TerminologySuggestion[]> {
  const term = text.trim();
  if (term.length < 2 || !organizationId) {
    return [];
  }

  const language = normalizeLocale(locale);
  const result = await requestGraphql({
    document: SearchConceptsQuery,
    variables: {
      text: term,
      first: 8,
      languages: [language],
    },
    organizationId,
  });

  return (result.searchConcepts?.results ?? []).flatMap((concept) => {
    const designationSuggestions = (concept.designations ?? []).map((designation) => ({
      label: designation.value,
      system: concept.codeSystem.url,
      code: concept.code,
      version: concept.codeSystem.version ?? null,
    }));

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
