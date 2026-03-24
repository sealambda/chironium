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

function buildLanguageCandidates(locale: string): string[] {
  const normalized = normalizeLocale(locale);
  const base = normalized.split("-")[0] ?? normalized;
  return Array.from(new Set([normalized, base, "en"]));
}

const USE_PRIORITY = ["display", "fully-specified-name", "synonym", "consumer", "short-name"];

function designationScore(use: string): number {
  const idx = USE_PRIORITY.indexOf(use);
  return idx >= 0 ? idx : 999;
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

  const languageCandidates = buildLanguageCandidates(locale);
  const result = await requestGraphql({
    document: SearchConceptsQuery,
    variables: {
      text: term,
      first: 8,
      languages: languageCandidates,
    },
    organizationId,
  });

  return (result.searchConcepts?.results ?? []).map((concept) => {
    const bestDesignation = [...(concept.designations ?? [])].sort(
      (a, b) => designationScore(a.use) - designationScore(b.use),
    )[0];
    return {
      label: bestDesignation?.value ?? concept.code,
      system: concept.codeSystem.url,
      code: concept.code,
      version: concept.codeSystem.version ?? null,
    };
  });
}
