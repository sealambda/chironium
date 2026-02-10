import type { PathologyRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { DataTable } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

import { usePathologyColumns } from "../../hooks/use-detail-columns";

interface PathologiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: PathologyRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying pathologies list with status badges.
 */
export function PathologiesDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
}: Readonly<PathologiesDrawerProps>) {
  const columns = usePathologyColumns();

  return (
    <HistoryDrawer
      title={m.drawer_pathologies()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_pathology()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">{m.empty_no_data()}</div>
        }
      />
    </HistoryDrawer>
  );
}
