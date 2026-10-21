import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isValid, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createSubscription,
  fetchSubscriptionPlans,
  updateSubscription,
} from "@/features/customers/api/subscriptions-api";
import { subscriptionSchema } from "@/features/customers/model/onboarding-schemas";
import {
  PausesSection,
  SubscriptionActionsSection,
} from "@/features/customers/ui/detail/subscription-management-dialogs";
import { SubscriptionFormFields } from "@/features/customers/ui/subscription/subscription-form-fields";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import * as m from "@/paraglide/messages";
import { useOrg } from "@/shared/session/use-org";
import type { SubscriptionPlan, SubscriptionRecord } from "@/shared/types/subscriptions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { getDateLocale } from "@/shared/utils/date-locale";
import { toDateInput } from "@/shared/utils/date-time-input";
import {
  customersQueryKeys,
  personQueryKeys,
  subscriptionPlansQueryKey,
} from "@/shared/utils/query-keys";

const todayIso = (): string => toDateInput(new Date());

type BadgeVariant = "success" | "warning" | "secondary" | "destructive" | "outline";

function stateBadgeVariant(state: string): BadgeVariant {
  switch (state) {
    case "active":
      return "success";
    case "suspended":
      return "warning";
    case "expired":
      return "secondary";
    case "canceled":
      return "destructive";
    default:
      return "outline";
  }
}

function formatSubscriptionEndDate(date: string | null | undefined): string | null {
  if (!date) {
    return null;
  }

  const parsedDate = parseISO(date);
  if (!isValid(parsedDate)) {
    return date;
  }

  return format(parsedDate, "PP", { locale: getDateLocale() });
}

function stateLabel(state: string): string {
  switch (state) {
    case "active":
      return m.subscription_state_active();
    case "suspended":
      return m.subscription_state_suspended();
    case "expired":
      return m.subscription_state_expired();
    case "canceled":
      return m.subscription_state_canceled();
    default:
      return state;
  }
}

interface EditSubscriptionDialogProps {
  readonly personId: string;
  readonly currentSubscription?: SubscriptionRecord;
  readonly children?: ReactNode;
  /** When provided, the dialog is controlled and `children` is treated as a trigger only if also provided. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function EditSubscriptionDialog({
  personId,
  currentSubscription,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Readonly<EditSubscriptionDialogProps>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    controlledOnOpenChange?.(next);
  };
  const [saving, setSaving] = useState(false);
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";
  const queryClient = useQueryClient();

  const initialValues = useMemo(
    () => ({
      planId: currentSubscription?.plan?.id ?? "",
      startDate: currentSubscription?.startDate ?? todayIso(),
    }),
    [currentSubscription],
  );
  const [planId, setPlanId] = useState(initialValues.planId);
  const [startDate, setStartDate] = useState(initialValues.startDate);

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: subscriptionPlansQueryKey(organizationId),
    queryFn: () => fetchSubscriptionPlans(organizationId),
    enabled: Boolean(organizationId),
  });

  const invalidateSubscriptionQueries = async () => {
    await Promise.all([
      invalidatePersonDetail(queryClient, personId),
      queryClient.invalidateQueries({
        queryKey: personQueryKeys.subscriptions(personId, organizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.personsPrefix(organizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: customersQueryKeys.subscriptions(organizationId),
      }),
    ]);
  };

  const form = useForm({
    defaultValues: initialValues,
    validators: { onSubmit: subscriptionSchema },
    onSubmit: async ({ value }) => {
      if (!value.planId || !organizationId) {
        return;
      }

      setSaving(true);
      try {
        if (currentSubscription) {
          await updateSubscription(
            currentSubscription.id,
            { planId: value.planId, startDate: value.startDate || undefined },
            organizationId,
          );
        } else {
          await createSubscription(
            { planId: value.planId, startDate: value.startDate || undefined },
            personId,
            organizationId,
          );
        }

        await invalidateSubscriptionQueries();
        setOpen(false);
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  const didResetOnOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      didResetOnOpen.current = false;
      return;
    }

    if (didResetOnOpen.current) {
      return;
    }

    didResetOnOpen.current = true;
    form.reset(initialValues);
    setPlanId(initialValues.planId);
    setStartDate(initialValues.startDate);
  }, [form, initialValues, open]);

  useEffect(() => {
    if (!open || currentSubscription || planId || plans.length === 0) {
      return;
    }

    const firstPlanId = plans[0]?.id;
    if (!firstPlanId) {
      return;
    }
    setPlanId(firstPlanId);
    form.setFieldValue("planId", firstPlanId);
  }, [currentSubscription, form, open, planId, plans]);

  let submitLabel = currentSubscription ? m.common_save() : m.common_add();
  if (saving) {
    submitLabel = m.common_saving();
  }

  const state = currentSubscription?.state ?? "";
  const effectiveEndDateLabel = formatSubscriptionEndDate(currentSubscription?.effectiveEndDate);
  const isEditing = Boolean(currentSubscription);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isControlled && !children ? null : (
        <DialogTrigger
          render={
            (children as React.ReactElement | undefined) ?? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label={m.subscription_manage_action()}
              >
                <Pencil className="size-3.5" />
              </Button>
            )
          }
        />
      )}

      <DialogContent
        data-testid="customer-subscription-dialog"
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? m.subscription_manage_title() : m.step_subscription_title()}
          </DialogTitle>
          {isEditing ? (
            <div className="flex flex-col items-start gap-2 pt-1">
              <div className="flex flex-col items-start gap-1">
                <p className="text-sm font-medium">{m.subscription_status_label()}</p>
                <Badge variant={stateBadgeVariant(state)}>{stateLabel(state)}</Badge>
              </div>
              {effectiveEndDateLabel ? (
                <div className="flex flex-col items-start gap-1">
                  <p className="text-sm font-medium">{m.subscription_field_end_date()}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {effectiveEndDateLabel}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        {currentSubscription ? (
          <SubscriptionActionsSection
            subscriptionId={currentSubscription.id}
            subscriptionState={currentSubscription.state}
            organizationId={organizationId}
            onMutated={invalidateSubscriptionQueries}
            onCloseParent={() => setOpen(false)}
          />
        ) : null}

        <SubscriptionFormFields
          plans={plans}
          plansLoading={plansLoading}
          planId={planId}
          startDate={startDate}
          onPlanChange={(nextValue) => {
            setPlanId(nextValue);
            form.setFieldValue("planId", nextValue);
          }}
          onStartDateChange={(nextValue) => {
            setStartDate(nextValue);
            form.setFieldValue("startDate", nextValue);
          }}
          planTriggerTestId="customer-subscription-plan-trigger"
          planOptionTestIdPrefix="customer-subscription-plan-option-"
          startDateInputTestId="customer-subscription-start-date-input"
        />

        {currentSubscription ? (
          <PausesSection
            pauses={currentSubscription.pauses ?? []}
            organizationId={organizationId}
            onMutated={invalidateSubscriptionQueries}
          />
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button
            onClick={() => form.handleSubmit()}
            loading={saving}
            disabled={!planId}
            data-testid="customer-subscription-save-button"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
