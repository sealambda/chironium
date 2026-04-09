import type { ColumnDef } from "@tanstack/react-table";
import { addMonths, formatISO } from "date-fns";

import type { CustomerListItem } from "@/features/customers/api/persons-api";
import * as m from "@/paraglide/messages";
import { Checkbox } from "@/shared/ui/checkbox";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { durationToMonths, formatDurationWithUnit } from "@/shared/utils/subscriptions-utils";

export const customerColumns: ColumnDef<CustomerListItem, unknown>[] = [
  {
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <span className="flex justify-center pr-1">
        <Checkbox
          data-testid="customers-select-all-checkbox"
          aria-label={m.customers_select_all_aria()}
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </span>
    ),
    cell: ({ row }) => (
      <span className="flex justify-center pr-1">
        <Checkbox
          data-testid={`customers-row-checkbox-${row.original.person.id}`}
          aria-label={m.customers_select_row_aria({
            name: formatPersonName(row.original.person.name),
          })}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </span>
    ),
    size: 40,
  },
  {
    id: "name",
    enableSorting: false,
    accessorFn: (row) => formatPersonName(row.person.name),
    header: () => m.customers_col_name(),
    cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
  },
  {
    id: "contact",
    enableSorting: false,
    header: () => m.customers_col_contact(),
    cell: ({ row }) => {
      const { person } = row.original;
      const name = formatPersonName(person.name);
      const contact = extractContactInfo(person.telecom);
      return <ContactButtonGroup {...contact} personName={name} stopPropagation />;
    },
  },
  {
    id: "plan",
    enableSorting: false,
    accessorFn: (row) => {
      const duration = row.subscription?.plan?.duration;
      if (!duration?.value || !duration?.code) {
        return -1;
      }
      return durationToMonths(duration);
    },
    header: () => m.customers_col_plan(),
    cell: ({ row }) => {
      const duration = row.original.subscription?.plan?.duration;
      const months = duration?.value && duration?.code ? durationToMonths(duration) : null;

      return (
        <span className="text-muted-foreground">
          {months ? formatDurationWithUnit(months, "MO") : "—"}
        </span>
      );
    },
  },
  {
    id: "progress",
    enableSorting: false,
    header: () => <span className="block min-w-56">{m.customers_col_progress()}</span>,
    cell: ({ row }) => {
      const { subscription } = row.original;
      const duration = subscription?.plan?.duration;
      const months =
        subscription && duration?.value && duration?.code ? durationToMonths(duration) : null;
      const endDate =
        subscription && months
          ? formatISO(addMonths(new Date(subscription.startDate), months), {
              representation: "date",
            })
          : null;

      return (
        <div className="min-w-56">
          {subscription && endDate && months ? (
            <SubscriptionProgress
              startDate={subscription.startDate}
              endDate={endDate}
              planDurationMonths={months}
            />
          ) : (
            <span className="text-muted-foreground text-sm">{m.customer_no_subscription()}</span>
          )}
        </div>
      );
    },
  },
];
