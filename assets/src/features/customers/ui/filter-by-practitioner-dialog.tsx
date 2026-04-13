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

interface FilterByPractitionerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly selectedPractitionerId: string | null;
  readonly onApply: (practitionerId: string | null, name: string | null) => void;
}

export function FilterByPractitionerDialog({
  open,
  onOpenChange,
  organizationId,
  selectedPractitionerId,
  onApply,
}: Readonly<FilterByPractitionerDialogProps>) {
  const [pendingId, setPendingId] = useState<string | null>(selectedPractitionerId);
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

  const reset = () => {
    setPendingId(selectedPractitionerId);
    setPractitionerSearch("");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      reset();
    }
  };

  const handleApply = () => {
    const name = pendingId
      ? (comboItems.find((item) => item.value === pendingId)?.label ?? null)
      : null;
    onApply(pendingId, name);
    onOpenChange(false);
    setPractitionerSearch("");
  };

  const handleClear = () => {
    onApply(null, null);
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
            {comboItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {m.customers_filter_by_practitioner_no_practitioners()}
              </p>
            ) : (
              <>
                <ListSearchField
                  value={practitionerSearch}
                  onChange={setPractitionerSearch}
                  placeholder={m.customers_filter_by_practitioner_placeholder()}
                />
                <div className="max-h-52 overflow-y-auto rounded-md border border-border/80 bg-background">
                  {filteredItems.length === 0 ? (
                    <p className="p-3 text-muted-foreground text-sm">
                      {m.customers_filter_by_practitioner_empty()}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60 p-1">
                      {filteredItems.map((item) => {
                        const rowId = `filter-practitioner-${item.value}`;
                        return (
                          <li key={item.value}>
                            <div className="flex items-start gap-3 px-2 py-2.5">
                              <Checkbox
                                id={rowId}
                                data-testid={`filter-practitioner-checkbox-${item.value}`}
                                checked={pendingId === item.value}
                                className="mt-0.5"
                                onCheckedChange={(v) => setPendingId(v ? item.value : null)}
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
              </>
            )}
          </Field>
        </FieldGroup>

        <DialogFooter>
          {selectedPractitionerId ? (
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
            disabled={pendingId === selectedPractitionerId}
            data-testid="filter-practitioner-apply-button"
          >
            {m.customers_filter_by_practitioner_apply()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
