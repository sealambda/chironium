import type { Organization } from "@/gql/graphql";

/**
 * Organisation context state.
 */
export interface OrgContextState {
  /**
   * Currently selected organization, if any.
   */
  selectedOrg: Organization | null;

  /**
   * List of accessible organizations for the current user.
   */
  availableOrgs: Organization[];

  /**
   * Loading state for organizations.
   */
  loading: boolean;

  /**
   * Error state for organizations.
   */
  error: Error | null;

  /**
   * Select an organization and persist preference.
   */
  selectOrg: (orgId: string) => Promise<void>;

  /**
   * Refresh accessible organizations.
   */
  refreshOrgs: () => Promise<Organization[]>;

  /**
   * Create a new organization.
   */
  createOrg: (data: { name: string; slug: string }) => Promise<Organization>;
}
