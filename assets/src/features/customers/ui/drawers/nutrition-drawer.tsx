import type { NutritionPlanRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { DataTable } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

import { useNutritionColumns } from "../../hooks/use-detail-columns";

interface NutritionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: NutritionPlanRecord[];
  onAdd?: () => void;
  onRowClick?: (record: NutritionPlanRecord) => void;
}

/**
 * Drawer displaying nutrition plans history with sortable table.
 */
export function NutritionDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
  onRowClick,
}: Readonly<NutritionDrawerProps>) {
  const columns = useNutritionColumns();

  return (
    <HistoryDrawer
      title={m.drawer_nutrition()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_plan()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        onRowClick={onRowClick}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            {m.empty_no_history()}
          </div>
        }
      />
    </HistoryDrawer>
  );
}
