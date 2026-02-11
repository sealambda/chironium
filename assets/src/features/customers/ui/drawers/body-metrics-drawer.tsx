import type { BodyMetricsRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { DataTable } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

import {
  renderBodyMetricsExpandedRow,
  useBodyMetricsColumns,
} from "../../hooks/use-detail-columns";

interface BodyMetricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: BodyMetricsRecord[];
  onAdd?: () => void;
  onRowClick?: (record: BodyMetricsRecord) => void;
}

/**
 * Drawer displaying body metrics history with expandable rows for measurements.
 */
export function BodyMetricsDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
  onRowClick,
}: Readonly<BodyMetricsDrawerProps>) {
  const columns = useBodyMetricsColumns();

  return (
    <HistoryDrawer
      title={m.drawer_body_metrics()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_record()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        renderExpandedRow={renderBodyMetricsExpandedRow}
        onRowClick={onRowClick}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">{m.empty_no_data()}</div>
        }
      />
    </HistoryDrawer>
  );
}
