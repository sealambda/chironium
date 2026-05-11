import { Pencil, Trash2 } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { toast } from "sonner";
import { format, isValid, parseISO } from "date-fns";

import {
  cancelSubscription,
  deleteSubscriptionPause,
  resumeSubscription,
  suspendSubscription,
  updateSubscriptionPause,
} from "@/features/customers/api/subscriptions-api";
import * as m from "@/paraglide/messages";
import type { SubscriptionPause } from "@/shared/types/subscriptions";
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
import { getDateLocale } from "@/shared/utils/date-locale";
import { toDateInput } from "@/shared/utils/date-time-input";

const todayIso = (): string => toDateInput(new Date());

function formatPauseDate(date: string | null | undefined): string {
  if (!date) {
    return "";
  }

  const parsedDate = parseISO(date);
  if (!isValid(parsedDate)) {
    return date;
  }

  return format(parsedDate, "PP", { locale: getDateLocale() });
}

interface PausesSectionProps {
  readonly pauses: readonly SubscriptionPause[];
  readonly organizationId: string;
  readonly onMutated: () => Promise<void>;
}

export function PausesSection({ pauses, organizationId, onMutated }: Readonly<PausesSectionProps>) {
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
  const startDate = formatPauseDate(pause.startDate);
  const endDate = formatPauseDate(pause.endDate);
  const dateRange = endDate ? `${startDate} - ${endDate}` : startDate;
  const isActivePause = pause.endDate === undefined || pause.endDate === null;

  return (
    <li className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium tabular-nums">{dateRange}</p>
        {pause.reason ? <p className="text-muted-foreground text-xs">{pause.reason}</p> : null}
        {isActivePause ? (
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

export function SuspendActionDialog({
  subscriptionId,
  organizationId,
  onMutated,
  trigger,
}: Readonly<{
  subscriptionId: string;
  organizationId: string;
  onMutated: () => Promise<void>;
  trigger?: ReactElement;
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
        render={trigger ?? <Button variant="outline">{m.subscription_action_suspend()}</Button>}
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

export function CancelActionDialog({
  subscriptionId,
  organizationId,
  onMutated,
  onCloseParent,
  trigger,
}: Readonly<{
  subscriptionId: string;
  organizationId: string;
  onMutated: () => Promise<void>;
  onCloseParent?: () => void;
  trigger?: ReactElement;
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
      onCloseParent?.();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={trigger ?? <Button variant="destructive">{m.subscription_action_cancel()}</Button>}
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

export function ResumeActionDialog({
  subscriptionId,
  organizationId,
  onMutated,
  trigger,
}: Readonly<{
  subscriptionId: string;
  organizationId: string;
  onMutated: () => Promise<void>;
  trigger?: ReactElement;
}>) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await resumeSubscription(subscriptionId, {}, organizationId);
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
        render={trigger ?? <Button variant="outline">{m.subscription_action_resume()}</Button>}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.subscription_resume_title()}</AlertDialogTitle>
          <AlertDialogDescription>{m.subscription_resume_desc()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={busy}>
            {m.subscription_action_resume()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
