import { useShallow } from "zustand/react/shallow";

import { useOrgStore } from "@/features/org/store/org-store";

/**
 * Hook to access organization state.
 */
export function useOrg() {
  return useOrgStore(
    useShallow((state) => ({
      selectedOrg: state.selectedOrg,
      availableOrgs: state.availableOrgs,
      loading: state.loading,
      error: state.error,
      selectOrg: state.selectOrg,
      refreshOrgs: state.refreshOrgs,
      createOrg: state.createOrg,
    })),
  );
}
