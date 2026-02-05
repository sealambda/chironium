import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useOrg } from "@/features/org/hooks/use-org";
import type { ContactPointType } from "@/gql/graphql";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { useCreateCustomer } from "../hooks/use-create-customer";
import { usePlans } from "../hooks/use-plans";
import type { CustomerFormData } from "../model/customer-schema";
import { CustomerForm } from "./customer-form";

interface CustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Sheet component for creating a customer.
 * Mobile-first design: full width on mobile, max-w-md on larger screens.
 * Uses flex layout with fixed header/footer and scrollable content.
 */
export function CustomerSheet({ open, onOpenChange }: CustomerSheetProps) {
  const { selectedOrg } = useOrg();
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const createCustomerMutation = useCreateCustomer();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CustomerFormData) => {
    if (!selectedOrg) return;

    setError(null);
    try {
      await createCustomerMutation.mutateAsync({
        contact: {
          name: data.name,
          contactPoints: buildContactPoints(data.contact),
        },
        subscription: {
          planId: data.subscription.planId,
          startDate: formatDate(data.subscription.startDate),
        },
      });
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create customer";
      setError(message);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        {/* Fixed header */}
        <SheetHeader className="px-4 pt-4">
          <SheetTitle>{m.create_customer_title()}</SheetTitle>
          <SheetDescription>{m.create_customer_desc()}</SheetDescription>
        </SheetHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          )}
          <CustomerForm
            key="new"
            id="customer-form"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            hideFooter
            submitLabel={m.create_customer_submit()}
            plans={plans}
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
              {m.common_cancel()}
            </Button>
            <Button
              type="submit"
              form="customer-form"
              disabled={createCustomerMutation.isPending || plansLoading}
              className="order-1 sm:order-2"
            >
              {createCustomerMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {createCustomerMutation.isPending
                ? m.common_creating()
                : m.create_customer_submit()}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function buildContactPoints(contact: CustomerFormData["contact"]) {
  const points: Array<{
    type: ContactPointType;
    value: string;
    isPrimary?: boolean;
  }> = [];

  if (contact.email) {
    points.push({ type: "EMAIL", value: contact.email, isPrimary: true });
  }
  if (contact.phone) {
    points.push({ type: "PHONE", value: contact.phone });
  }
  if (contact.instagram) {
    // Remove @ prefix if present
    const handle = contact.instagram.replace(/^@/, "");
    points.push({ type: "INSTAGRAM", value: handle });
  }

  return points.length > 0 ? points : undefined;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
