"use client"

import * as React from "react"
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const columnHelper = createColumnHelper()

interface StaffData {
  id: string
  userId: string
  desiredHoursPerWeek: number | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    createdAt: string
  }
  skills: string[]
  certifications: { locationId: string; locationName: string }[]
  availabilityWindows: { dayOfWeek: number; startTime: string; endTime: string }[]
  availabilityExceptions: { date: string; isAvailable: boolean; startTime: string | null; endTime: string | null }[]
  assignmentsCount: number
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getDayName(dayOfWeek: number) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return days[dayOfWeek]
}

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

export function StaffTable({ data: initialData }: { data: StaffData[] }) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const columns = React.useMemo(() => [
    columnHelper.accessor((row: StaffData) => row.user, {
      header: "Name",
      cell: ({ row }) => {
        const user = row.original.user
        return (
          <div className="font-medium">
            {user.firstName} {user.lastName}
          </div>
        )
      },
    }),
    columnHelper.accessor((row: StaffData) => row.user, {
      header: "Email",
      cell: ({ row }) => row.original.user.email,
    }),
    columnHelper.accessor((row: StaffData) => row.user, {
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.user.role}</Badge>
      ),
    }),
    columnHelper.accessor("desiredHoursPerWeek", {
      header: "Desired Hours/Week",
      cell: ({ row }) => row.original.desiredHoursPerWeek?.toString() || "—",
    }),
    columnHelper.accessor("skills", {
      header: "Skills",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.skills.map((skill: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {skill.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor("certifications", {
      header: "Certified Locations",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.certifications.map((cert: { locationName: string }, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">
              {cert.locationName}
            </Badge>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor("availabilityWindows", {
      header: "Availability",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground max-w-xs truncate">
          {row.original.availabilityWindows.map((w: { dayOfWeek: number; startTime: string; endTime: string }) => (
            <span key={w.dayOfWeek} className="mr-2">
              {getDayName(w.dayOfWeek)}: {w.startTime}-{w.endTime}
            </span>
          ))}
        </div>
      ),
    }),
    columnHelper.accessor("assignmentsCount", {
      header: "Assignments",
      cell: ({ row }) => row.original.assignmentsCount.toString(),
    }),
    columnHelper.accessor((row: StaffData) => row.user, {
      header: "Joined",
      cell: ({ row }) => formatDate(row.original.user.createdAt),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Schedule</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ], [])

  const table = useTable({
    features,
    data: initialData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    enableRowSelection: true,
  })

  return (
    <div className="w-full">
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
            <TableRow>
              {table.getAllColumns().map((column) => (
                <TableHead key={column.id}>
                  {column.getCanFilter() && (
                    <Input
                      placeholder={`Filter ${column.id}...`}
                      value={(column.getFilterValue() as string) ?? ""}
                      onChange={(event) =>
                        column.setFilterValue(event.target.value)
                      }
                      className="w-full h-8 text-xs"
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No staff members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          {pagination.pageIndex * pagination.pageSize +
            1}{" "}
          to{" "}
          {Math.min(
            (pagination.pageIndex + 1) *
              pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} results
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}