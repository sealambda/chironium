import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { CustomerListFilters } from "@/features/customers/model/person-filter-preferences";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { ListSearchField } from "@/shared/ui/list-search-field";
import { formatPersonName } from "@/shared/utils/person-utils";
import { practitionersBulkReassignQueryKey } from "@/shared/utils/query-keys";

interface PractitionerItem {
  value: string;
  label: string;
}

const UNASSIGNED_FILTER_VALUE = "__unassigned__";

interface CustomerFiltersDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly selectedFilters: CustomerListFilters;
  readonly showUnassignedOption: boolean;
  readonly onApply: (filters: CustomerListFilters) => void;
}

export function CustomerFiltersDialog({
  open,
  onOpenChange,
  organizationId,
  selectedFilters,
  showUnassignedOption,
  onApply,
}: Readonly<CustomerFiltersDialogProps>) {
  const [pendingAssignmentValue, setPendingAssignmentValue] = useState<string | null>(() =>
    assignmentToPendingValue(selectedFilters.assignment),
  );
  const [pendingHideFinishedPlans, setPendingHideFinishedPlans] = useState(
    selectedFilters.hideFinishedPlans,
  );
  const [practitionerSearch, setPractitionerSearch] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setPendingAssignmentValue(assignmentToPendingValue(selectedFilters.assignment));
    setPendingHideFinishedPlans(selectedFilters.hideFinishedPlans);
    setPractitionerSearch("");
  }, [open, selectedFilters]);

  const { data: practitioners = [] } = useQuery({
    queryKey: practitionersBulkReassignQueryKey(organizationId),
    queryFn: () => fetchPractitionersList(organizationId),
    enabled: open && Boolean(organizationId),
  });

  const comboItems = useMemo((): PractitionerItem[] => {
    const active = practitioners.filter((p) => p.active !== false);
    return sortPractitionersByGivenNameAsc(active).map((p) => ({
      value: p.id,
      label: formatPersonName(p.name),
    }));
  }, [practitioners]);

  const filteredItems = useMemo(() => {
    const q = practitionerSearch.trim().toLowerCase();
    if (!q) {
      return comboItems;
    }
    return comboItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [comboItems, practitionerSearch]);

  const selectedAssignmentValue = useMemo(
    () => assignmentToPendingValue(selectedFilters.assignment),
    [selectedFilters.assignment],
  );

  const showPractitionerSearch = comboItems.length > 0;
  const showPractitionerEmptyState =
    filteredItems.length === 0 && practitionerSearch.trim().length > 0;
  const showNoPractitionerNotice = comboItems.length === 0;
  const hasActiveFilters = selectedFilters.assignment !== null || selectedFilters.hideFinishedPlans;
  const hasPendingChanges =
    pendingAssignmentValue !== selectedAssignmentValue ||
    pendingHideFinishedPlans !== selectedFilters.hideFinishedPlans;

  const renderUnassignedOption = () => {
    if (!showUnassignedOption) {
      return null;
    }

    return (
      <li>
        <div className="flex items-start gap-3 px-2 py-2.5">
          <Checkbox
            id="filter-practitioner-unassigned"
            data-testid="filter-practitioner-checkbox-unassigned"
            checked={pendingAssignmentValue === UNASSIGNED_FILTER_VALUE}
            className="mt-0.5"
            onCheckedChange={(value) =>
              setPendingAssignmentValue(value ? UNASSIGNED_FILTER_VALUE : null)
            }
          />
          <label
            htmlFor="filter-practitioner-unassigned"
            className="min-w-0 flex-1 cursor-pointer text-foreground text-sm leading-snug"
          >
            {m.customers_filter_unassigned()}
          </label>
        </div>
      </li>
    );
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const resolveAssignment = (): CustomerListFilters["assignment"] => {
    if (pendingAssignmentValue === UNASSIGNED_FILTER_VALUE) {
      return { kind: "unassigned" };
    }

    if (pendingAssignmentValue) {
      const selectedItem = comboItems.find((item) => item.value === pendingAssignmentValue);
      if (selectedItem) {
        return {
          kind: "practitioner",
          id: selectedItem.value,
          name: selectedItem.label,
        };
      }
    }

    return null;
  };

  const handleApply = () => {
    onApply({
      assignment: resolveAssignment(),
      hideFinishedPlans: pendingHideFinishedPlans,
    });

    onOpenChange(false);
  };

  const handleClear = () => {
    onApply({ assignment: null, hideFinishedPlans: false });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-testid="customer-filters-dialog">
        <DialogHeader>
          <DialogTitle>{m.customers_filters_dialog_title()}</DialogTitle>
          <DialogDescription>{m.customers_filters_dialog_description()}</DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-5">
          <Field className="gap-2">
            <FieldLabel>{m.customers_filter_by_practitioner()}</FieldLabel>
            {showPractitionerSearch ? (
              <ListSearchField
                value={practitionerSearch}
                onChange={setPractitionerSearch}
                placeholder={m.customers_filter_by_practitioner_placeholder()}
              />
            ) : null}
            <div className="max-h-52 overflow-y-auto rounded-md border border-border/80 bg-background">
              {showPractitionerEmptyState ? (
                <p className="p-3 text-muted-foreground text-sm">
                  {m.customers_filter_by_practitioner_empty()}
                </p>
              ) : (
                <ul className="divide-y divide-border/60 p-1">
                  {renderUnassignedOption()}
                  {filteredItems.map((item) => {
                    const rowId = `filter-practitioner-${item.value}`;
                    return (
                      <li key={item.value}>
                        <div className="flex items-start gap-3 px-2 py-2.5">
                          <Checkbox
                            id={rowId}
                            data-testid={`filter-practitioner-checkbox-${item.value}`}
                            checked={pendingAssignmentValue === item.value}
                            className="mt-0.5"
                            onCheckedChange={(value) =>
                              setPendingAssignmentValue(value ? item.value : null)
                            }
                          />
                          <label
                            htmlFor={rowId}
                            data-testid={`filter-practitioner-label-${item.value}`}
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
            {showNoPractitionerNotice ? (
              <p className="text-muted-foreground text-sm">
                {m.customers_filter_by_practitioner_no_practitioners()}
              </p>
            ) : null}
          </Field>

          <Field className="gap-2">
            <FieldLabel>{m.customers_filters_subscription_section()}</FieldLabel>
            <div className="flex items-start gap-3 rounded-md border border-border/80 bg-background px-3 py-2.5">
              <Checkbox
                id="filter-hide-finished-plans"
                data-testid="filter-hide-finished-plans-checkbox"
                checked={pendingHideFinishedPlans}
                className="mt-0.5"
                onCheckedChange={(value) => setPendingHideFinishedPlans(Boolean(value))}
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="filter-hide-finished-plans"
                  className="cursor-pointer text-foreground text-sm leading-snug"
                >
                  {m.customers_filters_hide_finished()}
                </label>
                <FieldDescription className="mt-1">
                  {m.customers_filters_hide_finished_desc()}
                </FieldDescription>
              </div>
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" onClick={handleClear} className="mr-auto">
              {m.customers_filters_clear()}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {m.common_cancel()}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!hasPendingChanges}
            data-testid="customer-filters-apply-button"
          >
            {m.customers_filter_by_practitioner_apply()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function assignmentToPendingValue(assignment: CustomerListFilters["assignment"]): string | null {
  if (!assignment) {
    return null;
  }

  return assignment.kind === "unassigned" ? UNASSIGNED_FILTER_VALUE : assignment.id;
}
