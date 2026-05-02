import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  cancelSubscription,
  createSubscription,
  deleteSubscriptionPause,
  fetchSubscriptionPlans,
  resumeSubscription,
  suspendSubscription,
  updateSubscription,
  updateSubscriptionPause,
} from "@/features/customers/api/subscriptions-api";
import { subscriptionSchema } from "@/features/customers/model/onboarding-schemas";
import { SubscriptionFormFields } from "@/features/customers/ui/subscription/subscription-form-fields";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type {
  SubscriptionPause,
  SubscriptionPlan,
  SubscriptionRecord,
} from "@/shared/types/subscriptions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DatePickerString } from "@/shared/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";
import {
  customersQueryKeys,
  personQueryKeys,
  subscriptionPlansQueryKey,
} from "@/shared/utils/query-keys";

const todayIso = (): string => new Date().toISOString().split("T")[0] ?? "";

type SubscriptionState = "active" | "suspended" | "expired" | "canceled" | string;

type BadgeVariant = "success" | "warning" | "secondary" | "destructive" | "outline";

function stateBadgeVariant(state: SubscriptionState): BadgeVariant {
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

function stateLabel(state: SubscriptionState): string {
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
                data-testid="customer-subscription-edit-button"
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
            <div className="flex items-center gap-2 pt-1">
              <Badge variant={stateBadgeVariant(state)}>{stateLabel(state)}</Badge>
            </div>
          ) : null}
        </DialogHeader>

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
          <>
            <PausesSection
              pauses={currentSubscription.pauses ?? []}
              organizationId={organizationId}
              onMutated={invalidateSubscriptionQueries}
            />

            <LifecycleActionsRow
              subscription={currentSubscription}
              organizationId={organizationId}
              onMutated={invalidateSubscriptionQueries}
              onCloseParent={() => setOpen(false)}
            />
          </>
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

// ─── Pauses section ──────────────────────────────────────────────────

interface PausesSectionProps {
  readonly pauses: readonly SubscriptionPause[];
  readonly organizationId: string;
  readonly onMutated: () => Promise<void>;
}

function PausesSection({ pauses, organizationId, onMutated }: Readonly<PausesSectionProps>) {
  if (pauses.length === 0) {
    return null;
  }

  // Sort newest first by start date.
  const sorted = [...pauses].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));

  return (
    <section className="space-y-2 border-t pt-4">
      <h3 className="font-medium text-sm">{m.subscription_pauses_title()}</h3>
      <ul className="space-y-2">
        {sorted.map((pause) => (
          <PauseRow
            key={pause.id}
            pause={pause}
            organizationId={organizationId}
            onMutated={onMutated}
          />
        ))}
      </ul>
    </section>
  );
}

function PauseRow({
  pause,
  organizationId,
  onMutated,
}: Readonly<{
  pause: SubscriptionPause;
  organizationId: string;
  onMutated: () => Promise<void>;
}>) {
  const dateRange = pause.endDate ? `${pause.startDate} – ${pause.endDate}` : pause.startDate;

  return (
    <li className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium tabular-nums">{dateRange}</p>
        {pause.reason ? <p className="text-muted-foreground text-xs">{pause.reason}</p> : null}
        {!pause.endDate ? (
          <Badge variant="warning" className="mt-1">
            {m.subscription_pause_active()}
          </Badge>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <EditPauseDialog pause={pause} organizationId={organizationId} onMutated={onMutated} />
        <DeletePauseAlert
          pauseId={pause.id}
          organizationId={organizationId}
          onMutated={onMutated}
        />
      </div>
    </li>
  );
}

function EditPauseDialog({
  pause,
  organizationId,
  onMutated,
}: Readonly<{
  pause: SubscriptionPause;
  organizationId: string;
  onMutated: () => Promise<void>;
}>) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(pause.startDate ?? "");
  const [endDate, setEndDate] = useState(pause.endDate ?? "");
  const [reason, setReason] = useState(pause.reason ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setStartDate(pause.startDate ?? "");
      setEndDate(pause.endDate ?? "");
      setReason(pause.reason ?? "");
    }
  }, [open, pause]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSubscriptionPause(
        pause.id,
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          reason,
        },
        organizationId,
      );
      await onMutated();
      setOpen(false);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={m.subscription_pause_edit()}
          >
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.subscription_pause_edit_title()}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{m.field_start_date()}</FieldLabel>
            <DatePickerString value={startDate} onChange={setStartDate} />
          </Field>
          <Field>
            <FieldLabel>{m.subscription_field_end_date()}</FieldLabel>
            <DatePickerString value={endDate} onChange={setEndDate} />
          </Field>
          <Field>
            <FieldLabel>{m.subscription_field_reason()}</FieldLabel>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder={m.subscription_field_reason_placeholder()}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePauseAlert({
  pauseId,
  organizationId,
  onMutated,
}: Readonly<{
  pauseId: string;
  organizationId: string;
  onMutated: () => Promise<void>;
}>) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await deleteSubscriptionPause(pauseId, organizationId);
      await onMutated();
      setOpen(false);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            aria-label={m.subscription_pause_delete()}
          >
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.subscription_pause_delete_title()}</AlertDialogTitle>
          <AlertDialogDescription>{m.subscription_pause_delete_desc()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={busy}>
            {m.common_delete()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Lifecycle actions ───────────────────────────────────────────────

interface LifecycleActionsRowProps {
  readonly subscription: SubscriptionRecord;
  readonly organizationId: string;
  readonly onMutated: () => Promise<void>;
  readonly onCloseParent: () => void;
}

function LifecycleActionsRow({
  subscription,
  organizationId,
  onMutated,
  onCloseParent,
}: Readonly<LifecycleActionsRowProps>) {
  const state = subscription.state;

  return (
    <section className="space-y-2 border-t pt-4">
      <h3 className="font-medium text-sm">{m.subscription_lifecycle_title()}</h3>
      <div className="flex flex-wrap gap-2">
        {state === "active" ? (
          <SuspendActionDialog
            subscriptionId={subscription.id}
            organizationId={organizationId}
            onMutated={onMutated}
          />
        ) : null}

        {state === "suspended" ? (
          <ResumeActionDialog
            subscriptionId={subscription.id}
            organizationId={organizationId}
            onMutated={onMutated}
            label={m.subscription_action_resume()}
          />
        ) : null}

        {state === "canceled" || state === "expired" ? (
          <ResumeActionDialog
            subscriptionId={subscription.id}
            organizationId={organizationId}
            onMutated={onMutated}
            label={m.subscription_action_reactivate()}
          />
        ) : null}

        {state === "active" || state === "suspended" ? (
          <CancelActionDialog
            subscriptionId={subscription.id}
            organizationId={organizationId}
            onMutated={onMutated}
            onCloseParent={onCloseParent}
          />
        ) : null}
      </div>
    </section>
  );
}

function SuspendActionDialog({
  subscriptionId,
  organizationId,
  onMutated,
}: Readonly<{
  subscriptionId: string;
  organizationId: string;
  onMutated: () => Promise<void>;
}>) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [suspendedAt, setSuspendedAt] = useState(todayIso());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setSuspendedAt(todayIso());
    }
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await suspendSubscription(
        subscriptionId,
        { reason, suspendedAt: suspendedAt || undefined },
        organizationId,
      );
      await onMutated();
      setOpen(false);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline">{m.subscription_action_suspend()}</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.subscription_suspend_title()}</DialogTitle>
          <DialogDescription>{m.subscription_suspend_desc()}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{m.subscription_field_suspended_at()}</FieldLabel>
            <DatePickerString value={suspendedAt} onChange={setSuspendedAt} />
          </Field>
          <Field>
            <FieldLabel>{m.subscription_field_reason()}</FieldLabel>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder={m.subscription_field_reason_placeholder()}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleConfirm} loading={busy}>
            {m.subscription_action_suspend()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumeActionDialog({
  subscriptionId,
  organizationId,
  onMutated,
  label,
}: Readonly<{
  subscriptionId: string;
  organizationId: string;
  onMutated: () => Promise<void>;
  label: string;
}>) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setEndDate(todayIso());
    }
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await resumeSubscription(subscriptionId, { endDate: endDate || undefined }, organizationId);
      await onMutated();
      setOpen(false);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">{label}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.subscription_resume_title()}</DialogTitle>
          <DialogDescription>{m.subscription_resume_desc()}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{m.subscription_field_end_date()}</FieldLabel>
            <DatePickerString value={endDate} onChange={setEndDate} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleConfirm} loading={busy}>
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelActionDialog({
  subscriptionId,
  organizationId,
  onMutated,
  onCloseParent,
}: Readonly<{
  subscriptionId: string;
  organizationId: string;
  onMutated: () => Promise<void>;
  onCloseParent: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setEndDate(todayIso());
    }
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await cancelSubscription(subscriptionId, { endDate: endDate || undefined }, organizationId);
      await onMutated();
      setOpen(false);
      onCloseParent();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="destructive">{m.subscription_action_cancel()}</Button>}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.subscription_cancel_title()}</AlertDialogTitle>
          <AlertDialogDescription>{m.subscription_cancel_desc()}</AlertDialogDescription>
        </AlertDialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{m.subscription_field_end_date()}</FieldLabel>
            <DatePickerString value={endDate} onChange={setEndDate} />
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={busy}>
            {m.subscription_action_cancel()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
