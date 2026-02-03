import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOrg } from "@/features/org/hooks/use-org";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { createCustomer } from "../api/customers-api";
import {
  type CustomerFormData,
  customerToFormData,
  formDataToCustomer,
} from "../model/customer-schema";
import type { Customer } from "../model/customer-types";
import { useCustomersStore } from "../store/customers-store";
import { CustomerForm } from "./customer-form";

interface CustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Customer to edit - if provided, sheet opens in edit mode. */
  customer?: Customer;
}

/**
 * Sheet component for creating or editing a customer.
 * Mobile-first design: full width on mobile, max-w-md on larger screens.
 * Uses flex layout with fixed header/footer and scrollable content.
 */
export function CustomerSheet({
  open,
  onOpenChange,
  customer,
}: CustomerSheetProps) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const updateCustomer = useCustomersStore((state) => state.updateCustomer);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(customer);
  const title = isEditMode ? "Edit Customer" : "Add Customer";
  const description = isEditMode
    ? "Update the customer's information below. Required fields are marked with *."
    : "Enter the customer's information below. Required fields are marked with *.";
  const submitLabel = isEditMode ? "Update Customer" : "Create Customer";

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!selectedOrg) throw new Error("No organization selected");

      return createCustomer(selectedOrg.id, {
        name: data.name,
        contact: {
          email: data.contact.email || undefined,
          phone: data.contact.phone || undefined,
          instagram: data.contact.instagram || undefined,
        },
        subscription: {
          startDate: data.subscription.startDate,
          planId: data.subscription.planId,
        },
      });
    },
    onSuccess: () => {
      // Invalidate customers query to refresh list
      queryClient.invalidateQueries({
        queryKey: ["customers", "list", selectedOrg?.id],
      });
      setError(null);
      onOpenChange(false);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to create customer";
      setError(message);
    },
  });

  const handleSubmit = (data: CustomerFormData) => {
    if (!selectedOrg) return;

    setError(null);

    if (isEditMode && customer) {
      // For edit mode, use local store for now
      const updatedCustomer = formDataToCustomer(data, customer.id);
      updateCustomer(selectedOrg.id, updatedCustomer);
      onOpenChange(false);
    } else {
      // For create mode, use backend mutation
      createCustomerMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    setError(null);
    onOpenChange(false);
  };

  // Get initial values for edit mode.
  const initialValues = customer ? customerToFormData(customer) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        {/* Fixed header */}
        <SheetHeader className="px-4 pt-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
          {error && (
            <div className="mt-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </div>
          )}
        </SheetHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <CustomerForm
            key={customer?.id ?? "new"}
            id="customer-form"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            hideFooter
            initialValues={initialValues}
            submitLabel={submitLabel}
          />
        </div>

        {/* Fixed footer - OUTSIDE scroll container for consistent padding */}
        <div className="border-t bg-background px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="customer-form"
              className="order-1 sm:order-2"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
