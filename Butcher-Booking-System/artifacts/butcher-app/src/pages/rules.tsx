import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useGetRules, getGetRulesQueryKey, useUpdateRules } from "@workspace/api-client-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, Shield } from "lucide-react";

const schema = z.object({
  earlySlotCutoff: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
  maxAnimalsPerCustomer: z.number().int().min(1).max(100),
  cooldownPeriodDays: z.number().int().min(0).max(365),
  maxBookingsPerDay: z.number().int().min(1).max(200),
  allowSameCustomerSameDay: z.boolean(),
});

type RulesForm = z.infer<typeof schema>;

export default function Rules() {
  const qc = useQueryClient();
  const { data: rules, isLoading } = useGetRules({ query: { queryKey: getGetRulesQueryKey() } });

  const form = useForm<RulesForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      earlySlotCutoff: "09:00",
      maxAnimalsPerCustomer: 10,
      cooldownPeriodDays: 7,
      maxBookingsPerDay: 50,
      allowSameCustomerSameDay: false,
    },
  });

  useEffect(() => {
    if (rules) {
      form.reset({
        earlySlotCutoff: rules.earlySlotCutoff,
        maxAnimalsPerCustomer: rules.maxAnimalsPerCustomer,
        cooldownPeriodDays: rules.cooldownPeriodDays,
        maxBookingsPerDay: rules.maxBookingsPerDay,
        allowSameCustomerSameDay: rules.allowSameCustomerSameDay,
      });
    }
  }, [rules, form]);

  const updateRules = useUpdateRules({
    mutation: {
      onSuccess: () => {
        toast.success("Rules saved");
        qc.invalidateQueries({ queryKey: getGetRulesQueryKey() });
      },
      onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to save rules"),
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground"><RefreshCw size={16} className="animate-spin mr-2" />Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Booking Rules</h1>
        <p className="text-sm text-muted-foreground">Configure fairness rules and booking constraints</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield size={15} />
            Booking Constraints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => updateRules.mutate({ data: d }))} className="space-y-5">
              <FormField control={form.control} name="earlySlotCutoff" render={({ field }) => (
                <FormItem>
                  <FormLabel>Early Slot Cutoff Time</FormLabel>
                  <FormDescription className="text-xs">
                    Slots before this time are considered "early." The system tracks who gets early slots to prevent favoritism.
                  </FormDescription>
                  <FormControl>
                    <Input type="time" {...field} className="w-40" data-testid="input-early-cutoff" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="maxAnimalsPerCustomer" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Animals per Customer</FormLabel>
                  <FormDescription className="text-xs">Maximum number of animals a single customer can book.</FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-32"
                      data-testid="input-max-animals"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cooldownPeriodDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cooldown Period (days)</FormLabel>
                  <FormDescription className="text-xs">
                    A customer cannot book again within this many days of their last booking. Set to 0 to disable.
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-32"
                      data-testid="input-cooldown"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="maxBookingsPerDay" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Bookings per Day</FormLabel>
                  <FormDescription className="text-xs">Total active bookings allowed on any single day.</FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-32"
                      data-testid="input-max-bookings"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="allowSameCustomerSameDay" render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-same-customer"
                    />
                  </FormControl>
                  <div>
                    <FormLabel>Allow same customer to book same day</FormLabel>
                    <FormDescription className="text-xs">If off, a customer can only have one booking per day.</FormDescription>
                  </div>
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={updateRules.isPending} data-testid="btn-save-rules">
                {updateRules.isPending ? <RefreshCw size={13} className="animate-spin mr-2" /> : null}
                Save Rules
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
