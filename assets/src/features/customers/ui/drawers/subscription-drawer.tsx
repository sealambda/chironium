import type { SubscriptionHistoryRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { DataTable } from "@/shared/ui/data-table";
import { HistoryDrawer } from "@/shared/ui/history-drawer";

import { useSubscriptionColumns } from "../../hooks/use-detail-columns";

interface SubscriptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: SubscriptionHistoryRecord[];
  onAdd?: () => void;
}

/**
 * Drawer displaying full subscription history with sortable table.
 */
export function SubscriptionDrawer({
  isOpen,
  onClose,
  data,
  onAdd,
}: Readonly<SubscriptionDrawerProps>) {
  const columns = useSubscriptionColumns();

  return (
    <HistoryDrawer
      title={m.drawer_subscription()}
      isOpen={isOpen}
      onClose={onClose}
      onAdd={onAdd}
      addButtonLabel={m.drawer_add_subscription()}
    >
      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        emptyState={
          <div className="py-8 text-center text-muted-foreground text-sm">
            {m.empty_no_history()}
          </div>
        }
      />
    </HistoryDrawer>
  );
}
