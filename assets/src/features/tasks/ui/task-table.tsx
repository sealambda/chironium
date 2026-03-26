import { useNavigate } from "@tanstack/react-router";

import type { Task } from "@/features/tasks/api/tasks-api";
import { DataTable } from "@/shared/ui/data-table";

import { taskColumns } from "./task-columns";

interface TaskTableProps {
  items: Task[];
}

export function TaskTable({ items }: Readonly<TaskTableProps>) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-lg border">
      <DataTable
        columns={taskColumns}
        data={items}
        getRowId={(row) => row.id}
        onRowClick={(item) => {
          const personId = item.forPatient?.personId;
          if (!personId) {
            return;
          }
          void navigate({
            to: "/customers/$customerId",
            params: { customerId: personId },
          });
        }}
      />
    </div>
  );
}
