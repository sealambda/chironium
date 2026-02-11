import type { CycleRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { DataTable } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

import { renderCycleExpandedRow, useCycleColumns } from "../../hooks/use-detail-columns";

interface CycleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: CycleRecord[];
  onAdd?: () => void;
  onRowClick?: (record: CycleRecord) => void;
}

/**
 * Drawer displaying cycle history with expandable rows for symptoms.
 */
export function CycleDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
  onRowClick,
}: Readonly<CycleDrawerProps>) {
  const columns = useCycleColumns();

  return (
    <HistoryDrawer
      title={m.drawer_cycle()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_cycle()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        renderExpandedRow={renderCycleExpandedRow}
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
