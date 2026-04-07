import type { Practitioner } from "@/features/practitioners/api/practitioners-api";
import { DataTable } from "@/shared/ui/data-table";

import { practitionerColumns } from "./practitioner-columns";

interface PractitionerTableProps {
  readonly items: Practitioner[];
}

export function PractitionerTable({ items }: PractitionerTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <DataTable columns={practitionerColumns} data={items} getRowId={(row) => row.id} />
    </div>
  );
}
