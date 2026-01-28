import type { Organisation } from "@/gql/graphql";

/**
 * Organisation context state.
 */
export interface OrgContextState {
  /**
   * Currently selected organisation, if any.
   */
  selectedOrg: Organisation | null;

  /**
   * List of accessible organisations for the current user.
   */
  availableOrgs: Organisation[];

  /**
   * Loading state for organisations.
   */
  loading: boolean;

  /**
   * Error state for organisations.
   */
  error: Error | null;

  /**
   * Select an organisation and persist preference.
   */
  selectOrg: (orgId: string) => Promise<void>;

  /**
   * Refresh accessible organisations.
   */
  refreshOrgs: () => Promise<Organisation[]>;

  /**
   * Create a new organisation.
   */
  createOrg: (data: { name: string; slug: string }) => Promise<Organisation>;
}
