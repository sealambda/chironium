import type { ColumnDef } from "@tanstack/react-table";

import type { Practitioner } from "@/features/practitioners/api/practitioners-api";
import { formatPractitionerBirthDate } from "@/features/practitioners/lib/format-practitioner-date";
import * as m from "@/paraglide/messages";
import { formatPersonName } from "@/shared/utils/person-utils";

function statusLabel(practitioner: Practitioner): string {
  if (practitioner.active === true) {
    return m.practitioners_status_active();
  }
  if (practitioner.active === false) {
    return m.practitioners_status_inactive();
  }
  return m.practitioners_status_unknown();
}

export const practitionerColumns: ColumnDef<Practitioner, unknown>[] = [
  {
    id: "name",
    enableSorting: false,
    accessorFn: (row) => formatPersonName(row.name),
    header: () => m.practitioners_col_name(),
    cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
  },
  {
    id: "birthDate",
    enableSorting: false,
    accessorFn: (row) => row.birthDate ?? "",
    header: () => m.practitioners_col_birth_date(),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatPractitionerBirthDate(row.original.birthDate)}
      </span>
    ),
  },
  {
    id: "status",
    enableSorting: false,
    header: () => m.practitioners_col_status(),
    cell: ({ row }) => <span className="text-muted-foreground">{statusLabel(row.original)}</span>,
  },
];
