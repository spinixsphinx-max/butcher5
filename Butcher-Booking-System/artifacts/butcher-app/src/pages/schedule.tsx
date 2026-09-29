import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSchedule,
  getGetScheduleQueryKey,
  useUpdateSchedule,
  useGetAvailableSlots,
  getGetAvailableSlotsQueryKey,
} from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Clock } from "lucide-react";

const breakSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  label: z.string().optional(),
});

const scheduleSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  slotDuration: z.number().int().min(5, "Min 5 min").max(240, "Max 240 min"),
  breaks: z.array(breakSchema),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generatePreviewSlots(startTime: string, endTime: string, duration: number, breaks: Array<{ startTime: string; endTime: string }>) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots: { time: string; isBreak: boolean }[] = [];

  for (let t = start; t < end; t += duration) {
    const slotEnd = t + duration;
    const isDuringBreak = breaks.some((b) => {
      const bs = toMinutes(b.startTime);
      const be = toMinutes(b.endTime);
      return t < be && slotEnd > bs;
    });
    slots.push({ time: toTime(t), isBreak: isDuringBreak });
  }
  return slots;
}

export default function Schedule() {
  const qc = useQueryClient();
  const { data: schedule, isLoading } = useGetSchedule({ query: { queryKey: getGetScheduleQueryKey() } });

  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { startTime: "06:00", endTime: "18:00", slotDuration: 30, breaks: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "breaks" });

  useEffect(() => {
    if (schedule) {
      form.reset({
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        slotDuration: schedule.slotDuration,
        breaks: (schedule.breaks as Array<{ startTime: string; endTime: string; label?: string }>) || [],
      });
    }
  }, [schedule, form]);

  const updateSchedule = useUpdateSchedule({
    mutation: {
      onSuccess: () => {
        toast.success("Schedule saved");
        qc.invalidateQueries({ queryKey: getGetScheduleQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAvailableSlotsQueryKey() });
      },
      onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to save schedule"),
    },
  });

  const watchedValues = form.watch();

  const previewSlots = (() => {
    try {
      return generatePreviewSlots(watchedValues.startTime, watchedValues.endTime, watchedValues.slotDuration || 30, watchedValues.breaks || []);
    } catch {
      return [];
    }
  })();

  const activeSlots = previewSlots.filter((s) => !s.isBreak);

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground"><RefreshCw size={16} className="animate-spin mr-2" />Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Schedule Setup</h1>
        <p className="text-sm text-muted-foreground">Configure daily working hours and break times</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => updateSchedule.mutate({ data: d }))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl><Input type="time" {...field} data-testid="input-start-time" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl><Input type="time" {...field} data-testid="input-end-time" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="slotDuration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slot Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={240}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-slot-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Break Times</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => append({ startTime: "12:00", endTime: "13:00", label: "Lunch" })}
                      data-testid="btn-add-break"
                    >
                      <Plus size={12} className="mr-1" />Add Break
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="flex gap-2 items-end">
                        <FormField control={form.control} name={`breaks.${idx}.startTime`} render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">From</FormLabel>
                            <FormControl><Input type="time" {...field} className="h-8" data-testid={`input-break-start-${idx}`} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`breaks.${idx}.endTime`} render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">To</FormLabel>
                            <FormControl><Input type="time" {...field} className="h-8" data-testid={`input-break-end-${idx}`} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name={`breaks.${idx}.label`} render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">Label</FormLabel>
                            <FormControl><Input placeholder="Break" {...field} className="h-8" /></FormControl>
                          </FormItem>
                        )} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => remove(idx)}
                          data-testid={`btn-remove-break-${idx}`}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={updateSchedule.isPending} data-testid="btn-save-schedule">
                  {updateSchedule.isPending ? <RefreshCw size={13} className="animate-spin mr-2" /> : null}
                  Save Schedule
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={15} />
              Day Preview
              <span className="text-xs text-muted-foreground font-normal ml-1">({activeSlots.length} slots × 2 lines)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {previewSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Set valid times to preview</p>
              ) : (
                previewSlots.map((slot, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3 py-1.5 rounded text-xs ${
                      slot.isBreak
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        : "bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="font-mono w-12">{slot.time}</span>
                    {slot.isBreak ? (
                      <span className="text-amber-600 dark:text-amber-400">— Break —</span>
                    ) : (
                      <div className="flex gap-2">
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">Line 1</span>
                        <span className="px-1.5 py-0.5 bg-chart-2/10 text-chart-2 rounded">Line 2</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
