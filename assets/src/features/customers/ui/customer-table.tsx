import { useNavigate } from "@tanstack/react-router";

import type { CustomerListItem } from "@/features/customers/api/persons-api";
import { DataTable } from "@/shared/ui/data-table";

import { customerColumns } from "./customer-columns";

interface CustomerTableProps {
  items: CustomerListItem[];
}

export function CustomerTable({ items }: Readonly<CustomerTableProps>) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-lg border">
      <DataTable
        columns={customerColumns}
        data={items}
        getRowId={(row) => row.person.id}
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
