import type { ColumnDef } from "@tanstack/react-table";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable, type DataTableFeatures, SortableHeader } from "./data-table";

interface Person {
  id: string;
  name: string;
}

const people: Person[] = [
  { id: "1", name: "Bruno" },
  { id: "2", name: "Ada" },
];

const columns: ColumnDef<DataTableFeatures, Person, unknown>[] = [
  {
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        onChange={() => table.toggleAllPageRowsSelected()}
      />
    ),
    cell: ({ row }) => <span>{row.getIsSelected() ? "selected" : "unselected"}</span>,
  },
  {
    id: "name",
    accessorFn: (row) => row.name,
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => row.original.name,
  },
];

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent);

describe("DataTable", () => {
  afterEach(cleanup);

  it("sorts rows when the header is clicked", () => {
    render(<DataTable columns={columns} data={people} />);
    expect(names()).toEqual(["unselectedBruno", "unselectedAda"]);

    fireEvent.click(screen.getByRole("button", { name: "Name" }));

    expect(names()).toEqual(["unselectedAda", "unselectedBruno"]);
  });

  it("selects every row when selection is enabled", () => {
    render(<DataTable columns={columns} data={people} enableRowSelection />);

    fireEvent.click(screen.getByLabelText("Select all"));

    expect(screen.getAllByText("selected")).toHaveLength(2);
  });

  it("renders expanded content after toggling a row", () => {
    render(
      <DataTable
        columns={columns}
        data={people}
        renderExpandedRow={(row) => `Details for ${row.original.name}`}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0] as HTMLElement);

    expect(screen.getByText("Details for Bruno")).toBeInTheDocument();
  });
});
