import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardStats,
  getGetDashboardStatsQueryKey,
  useListBookings,
  getListBookingsQueryKey,
  useCompleteBooking,
  useCancelBooking,
  useGetLineStats,
  getGetLineStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { CheckCircle, XCircle, Edit, RefreshCw, Users, Layers, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const today = new Date().toISOString().split("T")[0];

function formatTime(t: string | null | undefined) {
  if (!t) return "—";
  return t;
}

function animalBadge(type: string) {
  const map: Record<string, string> = {
    sheep: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    goat: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    cow: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    camel: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  };
  const key = type.toLowerCase();
  return map[key] || "bg-muted text-muted-foreground";
}

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(
    { date: today },
    { query: { queryKey: getGetDashboardStatsQueryKey({ date: today }), refetchInterval: 30_000 } }
  );

  const { data: bookings, isLoading: bookingsLoading } = useListBookings(
    { status: "active", date: today },
    { query: { queryKey: getListBookingsQueryKey({ status: "active", date: today }), refetchInterval: 30_000 } }
  );

  const { data: lineStats } = useGetLineStats(
    { date: today },
    { query: { queryKey: getGetLineStatsQueryKey({ date: today }), refetchInterval: 30_000 } }
  );

  const complete = useCompleteBooking({
    mutation: {
      onSuccess: () => {
        toast.success("Booking completed");
        qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLineStatsQueryKey() });
      },
      onError: () => toast.error("Failed to complete booking"),
    },
  });

  const cancel = useCancelBooking({
    mutation: {
      onSuccess: () => {
        toast.success("Booking cancelled");
        qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLineStatsQueryKey() });
      },
      onError: () => toast.error("Failed to cancel booking"),
    },
  });

  const line1 = bookings?.filter((b) => b.assignedLine === 1) ?? [];
  const line2 = bookings?.filter((b) => b.assignedLine === 2) ?? [];
  const unassigned = bookings?.filter((b) => !b.assignedLine) ?? [];

  const statCards = [
    { label: "Total Today", value: stats?.totalBookingsToday ?? 0, icon: Users, color: "text-primary" },
    { label: "Completed", value: stats?.totalCompleted ?? 0, icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
    { label: "Remaining", value: stats?.remaining ?? 0, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
    { label: "Animals", value: stats?.totalAnimals ?? 0, icon: Layers, color: "text-blue-600 dark:text-blue-400" },
  ];

  function BookingCard({ booking }: { booking: NonNullable<typeof bookings>[0] }) {
    const isCompletePending = complete.isPending && complete.variables?.id === booking.id;
    const isCancelPending = cancel.isPending && cancel.variables?.id === booking.id;

    return (
      <div
        data-testid={`booking-card-${booking.id}`}
        className="flex flex-col gap-2 p-3 rounded-md border border-border bg-card hover:shadow-sm transition-shadow"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" data-testid={`booking-name-${booking.id}`}>{booking.customerName}</p>
            <p className="text-xs text-muted-foreground">{booking.phoneNumber}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {booking.assignedTime && (
              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{formatTime(booking.assignedTime)}</span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${animalBadge(booking.animalType)}`}>
              {booking.animalCount}x {booking.animalType}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5 mt-1">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs flex-1"
            disabled={isCompletePending || isCancelPending}
            onClick={() => complete.mutate({ id: booking.id })}
            data-testid={`btn-complete-${booking.id}`}
          >
            {isCompletePending ? <RefreshCw size={11} className="animate-spin mr-1" /> : <CheckCircle size={11} className="mr-1" />}
            Complete
          </Button>

          <Link href={`/bookings?edit=${booking.id}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" data-testid={`btn-edit-${booking.id}`}>
              <Edit size={11} />
            </Button>
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs px-2"
                disabled={isCancelPending || isCompletePending}
                data-testid={`btn-cancel-${booking.id}`}
              >
                {isCancelPending ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                <AlertDialogDescription>
                  Cancel booking for {booking.customerName}? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep</AlertDialogCancel>
                <AlertDialogAction onClick={() => cancel.mutate({ id: booking.id })}>
                  Cancel Booking
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  function LineColumn({ line, bookings: lineBookings }: { line: number; bookings: typeof line1 }) {
    const ls = lineStats?.find((s) => s.line === line);
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: line === 1 ? "hsl(var(--primary))" : "hsl(var(--chart-2))" }} />
            <h3 className="font-semibold text-sm">Line {line}</h3>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{ls?.remaining ?? lineBookings.length} active</span>
            <span>•</span>
            <span>{ls?.totalAnimals ?? 0} animals</span>
          </div>
        </div>
        <div className="space-y-2">
          {lineBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
              No bookings on Line {line}
            </p>
          ) : (
            lineBookings
              .sort((a, b) => (a.assignedTime ?? "").localeCompare(b.assignedTime ?? ""))
              .map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </div>
      </div>
    );
  }

  const loading = statsLoading || bookingsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/bookings/new">
          <Button size="sm" data-testid="btn-new-booking">New Booking</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon size={15} className={s.color} />
              </div>
              <p className="text-2xl font-bold" data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>
                {loading ? "—" : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line split */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Active Bookings by Line</h2>
          <Link href="/bookings">
            <button className="text-xs text-primary flex items-center gap-0.5 hover:underline" data-testid="link-all-bookings">
              View all <ChevronRight size={12} />
            </button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <LineColumn line={1} bookings={line1} />
          <div className="hidden md:block w-px bg-border" />
          <LineColumn line={2} bookings={line2} />
        </div>

        {unassigned.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Unassigned ({unassigned.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unassigned.map((b) => <BookingCard key={b.id} booking={b} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
