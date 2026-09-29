import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingRulesTable = pgTable("booking_rules", {
  id: serial("id").primaryKey(),
  earlySlotCutoff: text("early_slot_cutoff").notNull().default("09:00"),
  maxAnimalsPerCustomer: integer("max_animals_per_customer").notNull().default(10),
  cooldownPeriodDays: integer("cooldown_period_days").notNull().default(7),
  maxBookingsPerDay: integer("max_bookings_per_day").notNull().default(50),
  allowSameCustomerSameDay: boolean("allow_same_customer_same_day").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookingRulesSchema = createInsertSchema(bookingRulesTable).omit({ id: true, updatedAt: true });
export type InsertBookingRules = z.infer<typeof insertBookingRulesSchema>;
export type BookingRules = typeof bookingRulesTable.$inferSelect;
