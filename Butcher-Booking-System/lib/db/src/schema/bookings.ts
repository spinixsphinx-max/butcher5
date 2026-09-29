import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  animalType: text("animal_type").notNull(),
  animalCount: integer("animal_count").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  assignedLine: integer("assigned_line"),
  assignedTime: text("assigned_time"),
  bookingDate: text("booking_date").notNull(),
  slotOrder: integer("slot_order"),
  earlySlotCount: integer("early_slot_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
