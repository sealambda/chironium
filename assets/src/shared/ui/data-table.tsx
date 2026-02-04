import {
  type Column,
  type ColumnDef,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/utils";

// ============= Types =============

export interface DataTableProps<TData> {
  /** Column definitions for the table */
  columns: ColumnDef<TData, unknown>[];
  /** Data array to render */
  data: TData[];
  /** Optional className for the table container */
  className?: string;
  /** Optional: Render function for expanded row content */
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
  /** Optional: Controlled sorting state */
  sorting?: SortingState;
  /** Optional: Callback when sorting changes */
  onSortingChange?: (sorting: SortingState) => void;
  /** Optional: Controlled expanded state */
  expanded?: ExpandedState;
  /** Optional: Callback when expanded state changes */
  onExpandedChange?: (expanded: ExpandedState) => void;
  /** Optional: Custom empty state message or component */
  emptyState?: React.ReactNode;
  /** Optional: Get row ID for stable keys */
  getRowId?: (originalRow: TData, index: number) => string;
}

interface SortableHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  children: React.ReactNode;
}

// ============= Helper Components =============

function SortableHeader<TData, TValue>({
  column,
  children,
}: SortableHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span>{children}</span>;
  }

  const sortDirection = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 data-[state=sorted]:font-semibold"
      data-state={sortDirection ? "sorted" : undefined}
      onClick={() => column.toggleSorting()}
    >
      {children}
      {sortDirection === "asc" ? (
        <ArrowUpIcon className="ml-1 size-3" />
      ) : sortDirection === "desc" ? (
        <ArrowDownIcon className="ml-1 size-3" />
      ) : (
        <ArrowUpDownIcon className="ml-1 size-3 opacity-50" />
      )}
    </Button>
  );
}

function DefaultEmptyState() {
  return (
    <div
      data-slot="data-table-empty"
      className="flex min-h-[200px] items-center justify-center"
    >
      <div className="text-center">
        <div className="text-muted-foreground font-medium">
          No data available
        </div>
        <div className="text-muted-foreground mt-1 text-sm">
          Data will appear here once available.
        </div>
      </div>
    </div>
  );
}

// ============= Main Component =============

function DataTable<TData>({
  columns,
  data,
  className,
  renderExpandedRow,
  sorting: controlledSorting,
  onSortingChange,
  expanded: controlledExpanded,
  onExpandedChange,
  emptyState,
  getRowId,
}: DataTableProps<TData>) {
  // Internal state fallback for uncontrolled mode
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});

  const sorting = controlledSorting ?? internalSorting;
  const setSorting = onSortingChange ?? setInternalSorting;
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = onExpandedChange ?? setInternalExpanded;

  // Determine if expandable features are enabled
  const isExpandable = Boolean(renderExpandedRow);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(isExpandable && { expanded }),
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
    },
    ...(isExpandable && {
      onExpandedChange: (updater) => {
        const newExpanded =
          typeof updater === "function" ? updater(expanded) : updater;
        setExpanded(newExpanded);
      },
    }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(isExpandable && {
      getExpandedRowModel: getExpandedRowModel(),
      getRowCanExpand: () => true,
    }),
    ...(getRowId && { getRowId }),
  });

  const isEmpty = table.getRowModel().rows.length === 0;

  return (
    <div data-slot="data-table" className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {isExpandable && <TableHead className="w-10" />}
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (isExpandable ? 1 : 0)}
                className="h-24 text-center"
              >
                {emptyState ?? <DefaultEmptyState />}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsExpanded() ? "expanded" : undefined}
                >
                  {isExpandable && (
                    <TableCell className="w-10 p-0 pl-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        onClick={() => row.toggleExpanded()}
                        aria-label={
                          row.getIsExpanded() ? "Collapse row" : "Expand row"
                        }
                        aria-expanded={row.getIsExpanded()}
                      >
                        {row.getIsExpanded() ? (
                          <ChevronDownIcon className="size-4" />
                        ) : (
                          <ChevronRightIcon className="size-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {isExpandable && row.getIsExpanded() && renderExpandedRow && (
                  <TableRow data-slot="expanded-row">
                    <TableCell
                      colSpan={columns.length + 1}
                      className="bg-muted/30 p-4"
                    >
                      {renderExpandedRow(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ============= Exports =============

export { DataTable, SortableHeader };
