import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateBooking, getListBookingsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageCircle, RefreshCw, PlusCircle } from "lucide-react";

const schema = z.object({
  customerName: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .regex(/^[\p{L}\p{N}\s\-'.]+$/u, "Invalid characters in name"),
  phoneNumber: z
    .string()
    .min(7, "Phone number too short")
    .max(20)
    .regex(/^[+\d\s\-()]+$/, "Invalid phone number"),
  animalType: z.string().min(1, "Animal type is required"),
  animalCount: z
    .number({ invalid_type_error: "Must be a number" })
    .int()
    .min(1, "At least 1 animal")
    .max(50, "Maximum 50 animals"),
  notes: z.string().max(500).optional(),
  bookingDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const ANIMAL_TYPES = ["Sheep", "Goat", "Cow", "Camel", "Other"];

export default function NewBooking() {
  const qc = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      animalType: "",
      animalCount: 1,
      notes: "",
      bookingDate: new Date().toISOString().split("T")[0],
    },
  });

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: (booking) => {
        toast.success(`Booking created for ${booking.customerName}`);
        qc.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        form.reset({
          customerName: "",
          phoneNumber: "",
          animalType: "",
          animalCount: 1,
          notes: "",
          bookingDate: new Date().toISOString().split("T")[0],
        });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || "Failed to create booking";
        toast.error(msg);
      },
    },
  });

  function onSubmit(data: FormData) {
    createBooking.mutate({ data });
  }

  function handleWhatsApp() {
    const values = form.getValues();
    const phone = values.phoneNumber.replace(/[^+\d]/g, "");
    const message = encodeURIComponent(
      `Assalamu Alaikum ${values.customerName},\n\nYour booking has been confirmed:\n- Animal: ${values.animalCount}x ${values.animalType}\n- Date: ${values.bookingDate || "Today"}\n${values.notes ? `- Notes: ${values.notes}` : ""}\n\nJazakAllah Khairan.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-bold">New Booking</h1>
        <p className="text-sm text-muted-foreground">Create a booking for a customer</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+27 012 345 6789" {...field} data-testid="input-phone-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="animalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Animal Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-animal-type">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ANIMAL_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="animalCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. of Animals</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-animal-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bookingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-booking-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special instructions..."
                        className="resize-none"
                        rows={2}
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createBooking.isPending}
                  data-testid="btn-confirm-booking"
                >
                  {createBooking.isPending ? (
                    <RefreshCw size={14} className="animate-spin mr-2" />
                  ) : (
                    <PlusCircle size={14} className="mr-2" />
                  )}
                  Confirm Booking
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="flex items-center gap-1.5"
                  data-testid="btn-whatsapp"
                >
                  <MessageCircle size={14} className="text-green-600" />
                  WhatsApp
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
