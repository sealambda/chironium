import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

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
import { practitionersBulkReassignQueryKey } from "@/shared/utils/query-keys";

interface PractitionerItem {
  value: string;
  label: string;
}

const UNASSIGNED_FILTER_VALUE = "__unassigned__";

type CustomerAssignmentFilter =
  | { kind: "practitioner"; id: string; name: string }
  | { kind: "unassigned" }
  | null;

interface FilterByPractitionerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly selectedFilter: CustomerAssignmentFilter;
  readonly showUnassignedOption: boolean;
  readonly onApply: (filter: CustomerAssignmentFilter) => void;
}

export function FilterByPractitionerDialog({
  open,
  onOpenChange,
  organizationId,
  selectedFilter,
  showUnassignedOption,
  onApply,
}: Readonly<FilterByPractitionerDialogProps>) {
  const [pendingValue, setPendingValue] = useState<string | null>(() => {
    if (!selectedFilter) {
      return null;
    }

    return selectedFilter.kind === "unassigned" ? UNASSIGNED_FILTER_VALUE : selectedFilter.id;
  });
  const [practitionerSearch, setPractitionerSearch] = useState("");

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

  const selectedValue = useMemo(() => {
    if (!selectedFilter) {
      return null;
    }

    return selectedFilter.kind === "unassigned" ? UNASSIGNED_FILTER_VALUE : selectedFilter.id;
  }, [selectedFilter]);

  const showPractitionerSearch = comboItems.length > 0;
  const showPractitionerEmptyState =
    filteredItems.length === 0 && practitionerSearch.trim().length > 0;
  const showNoPractitionerNotice = comboItems.length === 0;

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
            checked={pendingValue === UNASSIGNED_FILTER_VALUE}
            className="mt-0.5"
            onCheckedChange={(value) => setPendingValue(value ? UNASSIGNED_FILTER_VALUE : null)}
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

  const reset = () => {
    if (!selectedFilter) {
      setPendingValue(null);
    } else if (selectedFilter.kind === "unassigned") {
      setPendingValue(UNASSIGNED_FILTER_VALUE);
    } else {
      setPendingValue(selectedFilter.id);
    }
    setPractitionerSearch("");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      reset();
    }
  };

  const handleApply = () => {
    if (pendingValue === UNASSIGNED_FILTER_VALUE) {
      onApply({ kind: "unassigned" });
    } else if (pendingValue) {
      const selectedItem = comboItems.find((item) => item.value === pendingValue);
      onApply(
        selectedItem
          ? { kind: "practitioner", id: selectedItem.value, name: selectedItem.label }
          : null,
      );
    } else {
      onApply(null);
    }

    onOpenChange(false);
    setPractitionerSearch("");
  };

  const handleClear = () => {
    onApply(null);
    onOpenChange(false);
    setPractitionerSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-testid="filter-practitioner-dialog">
        <DialogHeader>
          <DialogTitle>{m.customers_filter_by_practitioner_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.customers_filter_by_practitioner_dialog_description()}
          </DialogDescription>
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
                            checked={pendingValue === item.value}
                            className="mt-0.5"
                            onCheckedChange={(value) => setPendingValue(value ? item.value : null)}
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
        </FieldGroup>

        <DialogFooter>
          {selectedFilter ? (
            <Button type="button" variant="ghost" onClick={handleClear} className="mr-auto">
              {m.customers_filter_by_practitioner_clear()}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {m.customers_filter_by_practitioner_cancel()}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={pendingValue === selectedValue}
            data-testid="filter-practitioner-apply-button"
          >
            {m.customers_filter_by_practitioner_apply()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
