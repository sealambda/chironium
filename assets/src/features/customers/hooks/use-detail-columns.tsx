import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";

import { getSymptomById } from "@/mocks/data/catalogs";
import type {
  BodyMetricsRecord,
  CycleRecord,
  NutritionPlanRecord,
  PathologyRecord,
  SubscriptionHistoryRecord,
} from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { SortableHeader } from "@/shared/ui/data-table";
import { getDateLocale } from "@/shared/utils/date-locale";
import { heightMetersToCm } from "@/shared/utils/measurement-utils";

import { pathologyStatusConfig, subscriptionStatusConfig } from "../model/status-config";

// ─── Helper components ──────────────────────────────────────────────

interface MeasurementsGridProps {
  record: BodyMetricsRecord;
}

export function MeasurementsGrid({ record }: Readonly<MeasurementsGridProps>) {
  const { measurements } = record;

  const items = [
    { label: m.measurement_chest(), value: measurements.chest },
    { label: m.measurement_waist(), value: measurements.waist },
    { label: m.measurement_hip(), value: measurements.hip },
    { label: m.measurement_biceps(), value: measurements.biceps },
    { label: m.measurement_quadriceps(), value: measurements.quadriceps },
  ].filter((item) => item.value !== undefined);

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{m.empty_no_measurements()}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {items.map(({ label, value }) => (
        <div key={label} className="text-sm">
          <span className="text-muted-foreground">{label}:</span>
          <span className="ml-1 font-medium">{value} cm</span>
        </div>
      ))}
    </div>
  );
}

interface SymptomsListProps {
  symptoms: string[];
}

export function SymptomsList({ symptoms }: Readonly<SymptomsListProps>) {
  if (symptoms.length === 0) {
    return <p className="text-muted-foreground text-sm">{m.empty_no_symptoms()}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {symptoms.map((symptomId) => {
        const symptom = getSymptomById(symptomId);
        return (
          <Badge key={symptomId} variant="outline">
            {symptom?.name ?? symptomId}
          </Badge>
        );
      })}
    </div>
  );
}

// ─── Expanded row renderers ─────────────────────────────────────────

export function renderBodyMetricsExpandedRow(row: Row<BodyMetricsRecord>) {
  return <MeasurementsGrid record={row.original} />;
}

export function renderCycleExpandedRow(row: Row<CycleRecord>) {
  return <SymptomsList symptoms={row.original.symptoms} />;
}

// ─── Macro % helper ─────────────────────────────────────────────────

function macroPct(grams: number, kcalPerGram: number, totalKcal: number): string {
  if (totalKcal <= 0) {
    return "0";
  }
  return String(Math.round((grams * kcalPerGram * 100) / totalKcal));
}

// ─── Column hooks ───────────────────────────────────────────────────

export function useSubscriptionColumns() {
  return useMemo<ColumnDef<SubscriptionHistoryRecord, unknown>[]>(
    () => [
      {
        accessorKey: "startDate",
        header: ({ column }) => <SortableHeader column={column}>{m.table_start()}</SortableHeader>,
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "endDate",
        header: ({ column }) => <SortableHeader column={column}>{m.table_end()}</SortableHeader>,
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "planDurationMonths",
        header: m.table_duration,
        cell: ({ getValue }) => `${getValue()}mo`,
      },
      {
        accessorKey: "status",
        header: m.table_status,
        cell: ({ getValue }) => {
          const status = getValue() as keyof typeof subscriptionStatusConfig;
          return (
            <Badge variant={subscriptionStatusConfig[status]?.variant} className="capitalize">
              {status}
            </Badge>
          );
        },
      },
    ],
    [],
  );
}

export function useBodyMetricsColumns() {
  return useMemo<ColumnDef<BodyMetricsRecord, unknown>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column}>{m.table_date()}</SortableHeader>,
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "weight",
        header: ({ column }) => <SortableHeader column={column}>{m.table_weight()}</SortableHeader>,
        cell: ({ getValue }) => `${getValue()} kg`,
      },
      {
        accessorKey: "heightM",
        header: m.table_height,
        cell: ({ getValue }) => `${heightMetersToCm(getValue() as number)} cm`,
      },
      {
        accessorKey: "bmi",
        header: ({ column }) => <SortableHeader column={column}>{m.table_bmi()}</SortableHeader>,
        cell: ({ getValue }) => (getValue() as number).toFixed(1),
      },
    ],
    [],
  );
}

export function useNutritionColumns() {
  return useMemo<ColumnDef<NutritionPlanRecord, unknown>[]>(
    () => [
      {
        id: "period",
        accessorKey: "startDate",
        header: ({ column }) => <SortableHeader column={column}>{m.table_period()}</SortableHeader>,
        cell: ({ row }) => {
          const locale = getDateLocale();
          const start = format(new Date(row.original.startDate), "MMM d, yy", { locale });
          const end = row.original.endDate
            ? format(new Date(row.original.endDate), "MMM d, yy", { locale })
            : m.common_open();
          return `${start} — ${end}`;
        },
      },
      {
        accessorKey: "kcal",
        header: ({ column }) => <SortableHeader column={column}>{m.table_kcal()}</SortableHeader>,
        cell: ({ getValue }) => (getValue() as number).toLocaleString(),
      },
      {
        accessorKey: "protein",
        header: m.table_protein,
        cell: ({ row }) => {
          const g = row.original.protein;
          const pct = macroPct(g, 4, row.original.kcal);
          return `${g}g (${pct}%)`;
        },
      },
      {
        accessorKey: "carbs",
        header: m.table_carbs,
        cell: ({ row }) => {
          const g = row.original.carbs;
          const pct = macroPct(g, 4, row.original.kcal);
          return `${g}g (${pct}%)`;
        },
      },
      {
        accessorKey: "fat",
        header: m.table_fat,
        cell: ({ row }) => {
          const g = row.original.fat;
          const pct = macroPct(g, 9, row.original.kcal);
          return `${g}g (${pct}%)`;
        },
      },
    ],
    [],
  );
}

export function usePathologyColumns() {
  return useMemo<ColumnDef<PathologyRecord, unknown>[]>(
    () => [
      {
        accessorKey: "pathologyName",
        header: ({ column }) => <SortableHeader column={column}>{m.table_name()}</SortableHeader>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column}>{m.table_status()}</SortableHeader>,
        cell: ({ getValue }) => {
          const status = getValue() as keyof typeof pathologyStatusConfig;
          return (
            <Badge variant={pathologyStatusConfig[status]?.variant} className="capitalize">
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "diagnosedDate",
        header: ({ column }) => (
          <SortableHeader column={column}>{m.table_diagnosed()}</SortableHeader>
        ),
        cell: ({ row }) => {
          const value = row.original.diagnosedDate;
          if (!value) {
            return <span className="text-muted-foreground">{m.common_unknown()}</span>;
          }
          return format(new Date(value), "MMM yyyy", { locale: getDateLocale() });
        },
      },
      {
        accessorKey: "resolvedDate",
        header: m.table_resolved,
        cell: ({ row }) => {
          const value = row.original.resolvedDate;
          if (row.original.resolvedDateUnknown) {
            return <span className="text-muted-foreground">{m.common_unknown()}</span>;
          }
          return value ? format(new Date(value), "MMM yyyy", { locale: getDateLocale() }) : "—";
        },
      },
    ],
    [],
  );
}

export function useCycleColumns() {
  return useMemo<ColumnDef<CycleRecord, unknown>[]>(
    () => [
      {
        accessorKey: "startDate",
        header: ({ column }) => <SortableHeader column={column}>{m.table_start()}</SortableHeader>,
        cell: ({ getValue }) =>
          format(new Date(getValue() as string), "MMM d, yyyy", {
            locale: getDateLocale(),
          }),
      },
      {
        accessorKey: "endDate",
        header: m.table_end,
        cell: ({ getValue }) => {
          const endDate = getValue() as string | undefined;
          return endDate
            ? format(new Date(endDate), "MMM d, yyyy", { locale: getDateLocale() })
            : m.common_ongoing();
        },
      },
      {
        accessorKey: "cycleLength",
        header: m.table_length,
        cell: ({ getValue }) => {
          const length = getValue() as number | undefined;
          return length ? `${length}d` : "—";
        },
      },
      {
        id: "symptomsCount",
        accessorFn: (row) => row.symptoms.length,
        header: m.table_symptoms,
        cell: ({ getValue }) => getValue(),
      },
    ],
    [],
  );
}
