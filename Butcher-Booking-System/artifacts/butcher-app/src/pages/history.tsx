import { useState } from "react";
import { useListBookings, getListBookingsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search } from "lucide-react";

export default function History() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: completed, isLoading: cLoading } = useListBookings(
    { status: "completed", date: dateFilter || undefined, search: search || undefined },
    { query: { queryKey: getListBookingsQueryKey({ status: "completed", date: dateFilter || undefined, search: search || undefined }) } }
  );
  const { data: cancelled, isLoading: xLoading } = useListBookings(
    { status: "cancelled", date: dateFilter || undefined, search: search || undefined },
    { query: { queryKey: getListBookingsQueryKey({ status: "cancelled", date: dateFilter || undefined, search: search || undefined }) } }
  );

  const allHistory = [...(completed || []), ...(cancelled || [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const isLoading = cLoading || xLoading;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Booking History</h1>
        <p className="text-sm text-muted-foreground">All completed and cancelled bookings</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
            data-testid="input-history-search"
          />
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40 h-9"
          data-testid="input-history-date"
          placeholder="Filter by date"
        />
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="history-table">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Animal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Line / Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    <RefreshCw size={16} className="animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : allHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    No history found
                  </td>
                </tr>
              ) : (
                allHistory.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    data-testid={`history-row-${b.id}`}
                  >
                    <td className="px-4 py-3 font-medium">{b.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.phoneNumber}</td>
                    <td className="px-4 py-3 text-sm">{b.animalCount}x {b.animalType}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{b.bookingDate}</td>
                    <td className="px-4 py-3 text-xs">
                      {b.assignedLine ? `Line ${b.assignedLine}` : "—"}
                      {b.assignedTime ? ` @ ${b.assignedTime}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={b.status === "completed" ? "default" : "destructive"}
                        className="text-xs"
                        data-testid={`status-${b.id}`}
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">
                      {b.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {allHistory.length} record{allHistory.length !== 1 ? "s" : ""}
        {completed?.length ? ` · ${completed.length} completed` : ""}
        {cancelled?.length ? ` · ${cancelled.length} cancelled` : ""}
      </p>
    </div>
  );
}
