/** Fields selected by the ListOrganizations / CreateOrganization queries. */
export type OrgRecord = { id: string; name: string; slug: string };

/**
 * Organisation context state.
 */
export interface OrgContextState {
  /**
   * Currently selected organization, if any.
   */
  selectedOrg: OrgRecord | null;

  /**
   * List of accessible organizations for the current user.
   */
  availableOrgs: OrgRecord[];

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
  refreshOrgs: () => Promise<OrgRecord[]>;

  /**
   * Create a new organization.
   */
  createOrg: (data: { name: string; slug: string }) => Promise<OrgRecord>;
}
