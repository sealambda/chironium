import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { bulkReassignPractitionersToCustomers } from "@/features/customers/api/care-team-api";
import {
  fetchPractitionersList,
  sortPractitionersByGivenNameAsc,
} from "@/features/practitioners/api/practitioners-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { ListSearchField } from "@/shared/ui/list-search-field";
import { formatPersonName } from "@/shared/utils/person-utils";

interface PractitionerComboItem {
  value: string;
  label: string;
}

interface ReassignCustomersDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly selectedPersonIds: string[];
  readonly onCompleted: () => void;
}

export function ReassignCustomersDialog({
  open,
  onOpenChange,
  organizationId,
  selectedPersonIds,
  onCompleted,
}: Readonly<ReassignCustomersDialogProps>) {
  const [selectedPractitioners, setSelectedPractitioners] = useState<PractitionerComboItem[]>([]);
  const [replaceExistingAssignments, setReplaceExistingAssignments] = useState(false);
  const [practitionerSearch, setPractitionerSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: practitioners = [] } = useQuery({
    queryKey: ["practitioners", organizationId, "bulk-reassign"],
    queryFn: () => fetchPractitionersList(organizationId),
    enabled: open && Boolean(organizationId),
  });

  const comboItems = useMemo((): PractitionerComboItem[] => {
    const active = practitioners.filter((p) => p.active !== false);
    return sortPractitionersByGivenNameAsc(active).map((p) => ({
      value: p.id,
      label: formatPersonName(p.name),
    }));
  }, [practitioners]);

  const filteredPractitioners = useMemo(() => {
    const q = practitionerSearch.trim().toLowerCase();
    if (!q) {
      return comboItems;
    }
    return comboItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [comboItems, practitionerSearch]);

  const selectedValueSet = useMemo(
    () => new Set(selectedPractitioners.map((p) => p.value)),
    [selectedPractitioners],
  );

  const reset = () => {
    setSelectedPractitioners([]);
    setReplaceExistingAssignments(false);
    setPractitionerSearch("");
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      reset();
    }
  };

  const setPractitionerSelected = (item: PractitionerComboItem, selected: boolean) => {
    setSelectedPractitioners((prev) => {
      if (selected) {
        if (prev.some((p) => p.value === item.value)) {
          return prev;
        }
        return [...prev, item];
      }
      return prev.filter((p) => p.value !== item.value);
    });
  };

  const handleSubmit = async () => {
    if (selectedPractitioners.length === 0) {
      toast.error(m.customers_reassign_validation_practitioners());
      return;
    }

    setSubmitting(true);
    try {
      const result = await bulkReassignPractitionersToCustomers({
        organizationId,
        personIds: selectedPersonIds,
        practitionerIds: selectedPractitioners.map((p) => p.value),
        replaceExistingAssignments,
      });

      const skipped = result.personsSkippedWithoutPatient.length;
      if (skipped > 0) {
        toast.warning(
          m.customers_reassign_partial_warning({
            skipped,
            total: selectedPersonIds.length,
          }),
        );
      } else {
        toast.success(m.customers_reassign_success());
      }

      onCompleted();
      handleOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : m.customers_reassign_error();
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-testid="reassign-dialog">
        <DialogHeader>
          <DialogTitle>{m.customers_reassign_dialog_title()}</DialogTitle>
          <DialogDescription>{m.customers_reassign_dialog_description()}</DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-5">
          <Field className="gap-2">
            <FieldLabel>{m.customers_reassign_practitioners_label()}</FieldLabel>
            {comboItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {m.customers_reassign_no_practitioners()}
              </p>
            ) : (
              <>
                <ListSearchField
                  value={practitionerSearch}
                  onChange={setPractitionerSearch}
                  placeholder={m.customers_reassign_practitioners_placeholder()}
                />
                {selectedPractitioners.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPractitioners.map((p) => (
                      <span
                        key={p.value}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-foreground text-xs"
                      >
                        <span className="min-w-0 truncate">{p.label}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="size-5 shrink-0 rounded-full"
                          aria-label={m.customers_reassign_remove_professional_aria({
                            name: p.label,
                          })}
                          disabled={submitting}
                          onClick={() => setPractitionerSelected(p, false)}
                        >
                          <XIcon className="size-3" />
                        </Button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="max-h-52 overflow-y-auto rounded-md border border-border/80 bg-background">
                  {filteredPractitioners.length === 0 ? (
                    <p className="p-3 text-muted-foreground text-sm">
                      {m.customers_reassign_practitioners_empty()}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60 p-1">
                      {filteredPractitioners.map((item) => {
                        const rowId = `reassign-practitioner-${item.value}`;
                        return (
                          <li key={item.value}>
                            <div className="flex items-start gap-3 px-2 py-2.5">
                              <Checkbox
                                id={rowId}
                                data-testid={`reassign-practitioner-checkbox-${item.value}`}
                                checked={selectedValueSet.has(item.value)}
                                className="mt-0.5"
                                disabled={submitting}
                                onCheckedChange={(v) => setPractitionerSelected(item, Boolean(v))}
                              />
                              <label
                                htmlFor={rowId}
                                data-testid={`reassign-practitioner-label-${item.value}`}
                                className="min-w-0 flex-1 cursor-pointer text-foreground text-sm leading-snug"
                              >
                                {item.label}
                              </label>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </Field>

          <Field className="gap-3">
            <div className="flex gap-3">
              <Checkbox
                id="reassign-replace-assignments"
                data-testid="reassign-replace-checkbox"
                checked={replaceExistingAssignments}
                disabled={submitting}
                onCheckedChange={(v) => setReplaceExistingAssignments(Boolean(v))}
              />
              <div className="grid gap-1">
                <FieldLabel
                  htmlFor="reassign-replace-assignments"
                  className="cursor-pointer font-medium"
                >
                  {m.customers_reassign_replace_assignments_label()}
                </FieldLabel>
                <p className="text-muted-foreground text-sm">
                  {m.customers_reassign_replace_assignments_desc()}
                </p>
              </div>
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            {m.customers_reassign_cancel()}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || comboItems.length === 0}
            data-testid="reassign-apply-button"
          >
            {m.customers_reassign_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
