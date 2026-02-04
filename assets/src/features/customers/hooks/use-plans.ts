import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/features/org/hooks/use-org";
import { fetchPlans } from "../api/subscription-api";

export function usePlans() {
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";

  return useQuery({
    queryKey: ["plans", organizationId],
    queryFn: () => fetchPlans(organizationId),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000, // Plans don't change often, cache for 5 minutes.
  });
}
