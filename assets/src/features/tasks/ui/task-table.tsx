import type { Task } from "@/features/tasks/api/tasks-api";
import { DataTable } from "@/shared/ui/data-table";

import { taskColumns } from "./task-columns";

interface TaskTableProps {
  items: Task[];
}

export function TaskTable({ items }: Readonly<TaskTableProps>) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <DataTable columns={taskColumns} data={items} getRowId={(row) => row.id} />
    </div>
  );
}
