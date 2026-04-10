import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO, startOfDay } from "date-fns";
import { Building2, ClipboardList } from "lucide-react";
import { useEffect, useMemo } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import { fetchTasks } from "@/features/tasks/api/tasks-api";
import { formatStatus } from "@/features/tasks/ui/task-columns";
import { TaskTable } from "@/features/tasks/ui/task-table";
import * as m from "@/paraglide/messages";
import { useDetailMode } from "@/shared/layout/detail-context";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";
import { getDateLocale } from "@/shared/utils/date-locale";
import { formatPersonName } from "@/shared/utils/person-utils";
import { tasksListQueryKey } from "@/shared/utils/query-keys";

export function TasksPage() {
  const navigate = useNavigate();
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const { setHeaderContent } = useDetailMode();

  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: tasksListQueryKey(selectedOrg?.id ?? ""),
    queryFn: () => fetchTasks(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
    placeholderData: (previousData) => previousData,
  });

  const isLoading = tasksLoading && !tasks;
  const items = useMemo(() => tasks ?? [], [tasks]);

  useEffect(() => {
    setHeaderContent(null);
    return () => {
      setHeaderContent(null);
    };
  }, [setHeaderContent]);

  if (orgsLoading || (selectedOrg && isLoading)) {
    return <Loading />;
  }

  if (!selectedOrg) {
    return <EmptyState icon={Building2} title={m.no_org()} description={m.no_org_desc()} />;
  }

  if (tasksError) {
    const message = tasksError instanceof Error ? tasksError.message : "Failed to fetch tasks";
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">{m.tasks_error()}</div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-7">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-bold text-foreground text-xl uppercase tracking-wide">
            {m.tasks_title()}
          </h1>
          <span className="text-muted-foreground text-sm">({items.length})</span>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={m.tasks_empty()}
          description={m.tasks_empty_desc()}
        />
      ) : (
        <div className="space-y-3">
          {/* Mobile: stacked cards */}
          <div className="space-y-3 lg:hidden">
            {items.map((task) => (
              <button
                key={task.id}
                type="button"
                className="w-full cursor-pointer rounded-lg border bg-card p-4 text-left active:bg-muted/50"
                onClick={async () => {
                  const personId = task.forPatient?.personId;
                  if (!personId) {
                    return;
                  }
                  await navigate({
                    to: "/customers/$customerId",
                    params: { customerId: personId },
                  });
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">
                    {task.requestedPeriod?.start
                      ? format(startOfDay(parseISO(task.requestedPeriod.start)), "PP", {
                          locale: getDateLocale(),
                        })
                      : "—"}
                  </div>
                  <div className="shrink-0 text-muted-foreground text-sm">
                    {formatStatus(task.status)}
                  </div>
                </div>
                <div className="truncate text-sm">
                  {formatPersonName(task.forPatient?.person?.name)}
                </div>
                {task.description ? (
                  <div className="mt-1 truncate text-muted-foreground text-sm">
                    {task.description}
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          {/* Desktop: data table */}
          <div className="hidden lg:block">
            <TaskTable items={items} />
          </div>
        </div>
      )}
    </div>
  );
}
