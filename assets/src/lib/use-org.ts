import { useContext } from "react";
import { OrgContext } from "./org-context";

/**
 * Hook to access organisation context.
 * Must be used within an OrgProvider.
 */
export function useOrg() {
  const context = useContext(OrgContext);

  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }

  return context;
}
