import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useListBookings,
  getListBookingsQueryKey,
  useUpdateBooking,
  useDeleteBooking,
  useAllocateSlots,
  getGetDashboardStatsQueryKey,
  getGetLineStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shuffle, Trash2, Edit, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const today = new Date().toISOString().split("T")[0];

type Booking = {
  id: number;
  customerName: string;
  phoneNumber: string;
  animalType: string;
  animalCount: number;
  notes?: string | null;
  status: string;
  assignedLine?: number | null;
  assignedTime?: string | null;
  bookingDate: string;
  slotOrder?: number | null;
  createdAt: string;
};

export default function AllBookings() {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(today);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editLine, setEditLine] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [location] = useLocation();
  const qc = useQueryClient();

  const { data: bookings, isLoading } = useListBookings(
    { status: "active", date: dateFilter, search: search || undefined },
    { query: { queryKey: getListBookingsQueryKey({ status: "active", date: dateFilter, search: search || undefined }) } }
  );

  const allocate = useAllocateSlots({
    mutation: {
      onSuccess: () => {
        toast.success("Slots allocated fairly");
        qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLineStatsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.response?.data?.error || "Allocation failed"),
    },
  });

  const updateBooking = useUpdateBooking({
    mutation: {
      onSuccess: () => {
        toast.success("Booking updated");
        qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        setEditBooking(null);
      },
      onError: (err: any) => toast.error(err?.response?.data?.error || "Update failed"),
    },
  });

  const deleteBooking = useDeleteBooking({
    mutation: {
      onSuccess: () => {
        toast.success("Booking deleted");
        qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: () => toast.error("Failed to delete booking"),
    },
  });

  function openEdit(b: Booking) {
    setEditBooking(b);
    setEditLine(b.assignedLine ? String(b.assignedLine) : "");
    setEditTime(b.assignedTime || "");
  }

  function saveEdit() {
    if (!editBooking) return;
    updateBooking.mutate({
      id: editBooking.id,
      data: {
        assignedLine: editLine ? parseInt(editLine) : null,
        assignedTime: editTime || null,
      },
    });
  }

  const sorted = (bookings || []).slice().sort((a, b) => {
    if (a.assignedLine && b.assignedLine) {
      if (a.assignedLine !== b.assignedLine) return a.assignedLine - b.assignedLine;
    }
    if (a.assignedTime && b.assignedTime) return a.assignedTime.localeCompare(b.assignedTime);
    return (a.slotOrder ?? 999) - (b.slotOrder ?? 999);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">All Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage active bookings and slot assignments</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={allocate.isPending}
              data-testid="btn-allocate-slots"
            >
              {allocate.isPending ? (
                <RefreshCw size={13} className="animate-spin mr-1.5" />
              ) : (
                <Shuffle size={13} className="mr-1.5" />
              )}
              Allocate Slots
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Allocate Slots</AlertDialogTitle>
              <AlertDialogDescription>
                Randomly assign fair time slots to all bookings for {dateFilter}. This respects cooldown rules and ensures no customer gets early slots repeatedly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => allocate.mutate({ data: { date: dateFilter } })}>
                Allocate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
            data-testid="input-search"
          />
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40 h-9"
          data-testid="input-date-filter"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="bookings-table">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Animal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Line</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    <RefreshCw size={16} className="animate-spin inline mr-2" />Loading...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    No active bookings found
                  </td>
                </tr>
              ) : (
                sorted.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    data-testid={`row-booking-${b.id}`}
                  >
                    <td className="px-4 py-3 font-medium">{b.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.phoneNumber}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs">{b.animalCount}x {b.animalType}</span>
                    </td>
                    <td className="px-4 py-3">
                      {b.assignedLine ? (
                        <Badge variant="outline" className="text-xs">Line {b.assignedLine}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {b.assignedTime ? (
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{b.assignedTime}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(b as Booking)}
                          data-testid={`btn-edit-${b.id}`}
                        >
                          <Edit size={13} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              disabled={deleteBooking.isPending}
                              data-testid={`btn-delete-${b.id}`}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                              <AlertDialogDescription>
                                Permanently delete the booking for {b.customerName}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteBooking.mutate({ id: b.id })}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editBooking} onOpenChange={(o) => !o && setEditBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Slot — {editBooking?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Assigned Line</Label>
              <Select value={editLine} onValueChange={setEditLine}>
                <SelectTrigger data-testid="select-line">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Line 1</SelectItem>
                  <SelectItem value="2">Line 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Time</Label>
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                data-testid="input-assigned-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBooking(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateBooking.isPending} data-testid="btn-save-edit">
              {updateBooking.isPending ? <RefreshCw size={13} className="animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
