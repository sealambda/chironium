import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format, formatDistanceStrict } from "date-fns";
import { ArrowUpDown, Mail } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
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
import type { Customer } from "../model/customer-types";
import {
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "../utils/contact-utils";
import {
  calculateProgressPercent,
  formatPlanDuration,
  getProgressColor,
} from "../utils/progress-utils";
import { StatusAvatar } from "./status-avatar";

const columnHelper = createColumnHelper<Customer>();

interface CustomerTableProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
}

/**
 * Customer table component for desktop/tablet view (≥768px).
 *
 * Features:
 * - Sortable name column
 * - StatusAvatar with colored ring in dedicated column
 * - Separate sortable columns for start date, end date, plan, and progress
 * - Contact buttons (email, WhatsApp, Instagram)
 * - Row click to edit customer
 *
 * Uses TanStack Table for sorting and filtering.
 * Note: Mobile view (customer-card.tsx) uses full progress bar with dates.
 */
export function CustomerTable({
  customers,
  onCustomerClick,
}: CustomerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = [
    // Avatar column (no header, just StatusAvatar)
    columnHelper.display({
      id: "avatar",
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <StatusAvatar customer={row.original} size="sm" />
        </div>
      ),
      size: 60,
    }),

    // Name column (renamed from Customer, sortable)
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -mx-2 px-2 font-medium hover:bg-muted"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-sm">{row.original.name}</span>
      ),
      size: 180,
    }),

    // Start Date column - sortable
    columnHelper.accessor("subscription.startDate", {
      id: "startDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -mx-2 px-2 font-medium hover:bg-muted"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Start Date
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const startDate = row.original.subscription.startDate;
        const now = new Date();
        const relativeTime = formatDistanceStrict(startDate, now, {
          addSuffix: true,
        });

        return (
          <div className="flex flex-col">
            <span className="text-sm text-foreground">
              {format(startDate, "MMM do, yyyy")}
            </span>
            <span className="text-muted-foreground text-xs">
              {relativeTime}
            </span>
          </div>
        );
      },
      size: 140,
      sortingFn: "datetime",
    }),

    // End Date column - sortable
    columnHelper.accessor("subscription.endDate", {
      id: "endDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -mx-2 px-2 font-medium hover:bg-muted"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          End Date
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const endDate = row.original.subscription.endDate;
        const now = new Date();
        const relativeTime = formatDistanceStrict(endDate, now, {
          addSuffix: true,
        });

        return (
          <div className="flex flex-col">
            <span className="text-sm text-foreground">
              {format(endDate, "MMM do, yyyy")}
            </span>
            <span className="text-muted-foreground text-xs">
              {relativeTime}
            </span>
          </div>
        );
      },
      size: 140,
      sortingFn: "datetime",
    }),

    // Plan Duration column - sortable
    columnHelper.accessor("subscription.planDurationMonths", {
      id: "planDuration",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -mx-2 px-2 font-medium hover:bg-muted"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Plan
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {formatPlanDuration(row.original.subscription.planDurationMonths)}
        </span>
      ),
      size: 90,
      sortingFn: "basic",
    }),

    // Progress Percentage column - sortable
    columnHelper.display({
      id: "progress",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -mx-2 px-2 font-medium hover:bg-muted"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Progress
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const progressPercent = calculateProgressPercent(row.original);
        const progressColor = getProgressColor(progressPercent);

        return (
          <div className="flex items-center gap-2">
            <div className="relative h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progressColor,
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <Badge
              className={cn(
                "shrink-0 font-semibold text-white text-xs",
                progressColor,
              )}
            >
              {progressPercent}%
            </Badge>
          </div>
        );
      },
      size: 180,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const percentA = calculateProgressPercent(rowA.original);
        const percentB = calculateProgressPercent(rowB.original);
        return percentA - percentB;
      },
    }),

    // Contact Actions column
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Contact</div>,
      cell: ({ row }) => {
        const { email, phone, instagram } = row.original.contact;
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={!email}
              onClick={(e) => {
                e.stopPropagation();
                email && window.open(getEmailUrl(email), "_blank");
              }}
              aria-label={`Email ${row.original.name}`}
            >
              <Mail className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-emerald-500 disabled:opacity-30"
              disabled={!phone}
              onClick={(e) => {
                e.stopPropagation();
                phone && window.open(getWhatsAppUrl(phone), "_blank");
              }}
              aria-label={`WhatsApp ${row.original.name}`}
            >
              <SiWhatsapp size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-pink-500 disabled:opacity-30"
              disabled={!instagram}
              onClick={(e) => {
                e.stopPropagation();
                instagram && window.open(getInstagramUrl(instagram), "_blank");
              }}
              aria-label={`Instagram ${row.original.name}`}
            >
              <SiInstagram size={16} />
            </Button>
          </div>
        );
      },
      size: 120,
    }),
  ];

  const table = useReactTable({
    data: customers,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="bg-muted/30"
                >
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
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <div className="text-muted-foreground">No customers found.</div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  onCustomerClick && "cursor-pointer hover:bg-accent/50",
                )}
                onClick={() => onCustomerClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
