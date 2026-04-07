import { useNavigate } from "@tanstack/react-router";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";

import type { CustomerListItem } from "@/features/customers/api/persons-api";
import { DataTable } from "@/shared/ui/data-table";

import { customerColumns } from "./customer-columns";

interface CustomerTableProps {
  items: CustomerListItem[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
}

export function CustomerTable({
  items,
  rowSelection,
  onRowSelectionChange,
}: Readonly<CustomerTableProps>) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-lg border">
      <DataTable
        columns={customerColumns}
        data={items}
        getRowId={(row) => row.person.id}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        enableRowSelection
        onRowClick={(item) =>
          navigate({
            to: "/customers/$customerId",
            params: { customerId: item.person.id },
          })
        }
      />
    </div>
  );
}
