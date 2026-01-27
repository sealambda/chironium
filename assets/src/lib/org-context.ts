import { createContext } from "react";

/**
 * Organisation type returned from the API.
 */
import type { OrganisationResourceSchema } from "./ash";

export type Organisation = Omit<OrganisationResourceSchema, "__type" | "__primitiveFields">;

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
   * Create a new organisation (ADMIN only).
   */
  createOrg: (data: { name: string; slug: string }) => Promise<Organisation>;
}

/**
 * Organisation context for managing selected organisation across the app.
 */
export const OrgContext = createContext<OrgContextState | null>(null);
