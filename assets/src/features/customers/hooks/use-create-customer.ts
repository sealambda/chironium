import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/features/org/hooks/use-org";
import {
  type CreateContactInput,
  createContact,
  createSubscription,
} from "../api/subscription-api";

export type CreateCustomerInput = {
  contact: CreateContactInput;
  subscription: {
    planId: string;
    startDate: string; // ISO date string YYYY-MM-DD
  };
};

export function useCreateCustomer() {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomerInput) => {
      const organizationId = selectedOrg?.id;
      if (!organizationId) {
        throw new Error("No organization selected");
      }

      // Step 1: Create contact with contact points
      const contact = await createContact(input.contact, organizationId);

      // Step 2: Create subscription linking contact to plan
      const subscription = await createSubscription(
        {
          subscriberId: contact.id,
          planId: input.subscription.planId,
          startDate: input.subscription.startDate,
        },
        organizationId,
      );

      return { contact, subscription };
    },
    onSuccess: () => {
      // Invalidate customers list to refetch
      queryClient.invalidateQueries({
        queryKey: ["customers", "list", selectedOrg?.id],
      });
    },
  });
}
