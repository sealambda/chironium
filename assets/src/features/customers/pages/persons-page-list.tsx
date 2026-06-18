import { Link } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import { Search, Users } from "lucide-react";
import type * as React from "react";

import type { CustomerListItem } from "@/features/customers/api/persons-api";
import { CustomerTable } from "@/features/customers/ui/customer-table";
import { PersonCard } from "@/features/customers/ui/person-card";
import * as m from "@/paraglide/messages";
import { Checkbox } from "@/shared/ui/checkbox";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatPersonName } from "@/shared/utils/person-utils";

export function CustomerList({
  items,
  isEmpty,
  filterEmptyState,
  hideFinishedPlans,
  onAdd,
  onClearFilters,
  onShowFinishedPlans,
  rowSelection,
  onRowSelectionChange,
}: Readonly<{
  items: CustomerListItem[];
  isEmpty: boolean;
  filterEmptyState: "search" | "filters";
  hideFinishedPlans: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
  onShowFinishedPlans: () => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}>) {
  if (isEmpty) {
    return (
      <EmptyState
        icon={Users}
        title={m.customers_empty()}
        description={m.customers_empty_desc()}
        actions={[
          {
            label: m.customer_add(),
            testId: "customers-new-button-empty",
            onAction: onAdd,
          },
        ]}
      />
    );
  }

  if (items.length === 0) {
    if (filterEmptyState === "filters") {
      const actions = [
        {
          label: m.customers_filters_clear(),
          testId: "customers-clear-filters-button",
          onAction: onClearFilters,
        },
      ];

      if (hideFinishedPlans) {
        actions.push({
          label: m.customers_filters_show_finished(),
          testId: "customers-show-finished-plans-button",
          onAction: onShowFinishedPlans,
        });
      }

      return (
        <EmptyState icon={Search} title={m.customers_filters_no_active_plans()} actions={actions} />
      );
    }

    return <EmptyState icon={Search} title={m.customers_no_results()} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: stacked cards with bulk selection */}
      <div className="flex flex-col gap-3 lg:hidden">
        {items.map((item) => {
          const id = item.person.id;
          const name = formatPersonName(item.person.name);
          return (
            <div key={id} className="relative">
              <Checkbox
                aria-label={m.customers_select_row_aria({ name })}
                checked={Boolean(rowSelection[id])}
                className="absolute top-4 right-4 z-10"
                onCheckedChange={(value) => {
                  const selected = Boolean(value);
                  onRowSelectionChange((prev) => {
                    if (selected) {
                      return { ...prev, [id]: true };
                    }
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Link
                to="/customers/$customerId"
                params={{ customerId: id }}
                className="block min-w-0"
              >
                <PersonCard item={item} />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Desktop: data table */}
      <div className="hidden lg:block">
        <CustomerTable
          items={items}
          rowSelection={rowSelection}
          onRowSelectionChange={onRowSelectionChange}
        />
      </div>
    </div>
  );
}
