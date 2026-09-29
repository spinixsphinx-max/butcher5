import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduleTable = pgTable("schedule", {
  id: serial("id").primaryKey(),
  startTime: text("start_time").notNull().default("06:00"),
  endTime: text("end_time").notNull().default("18:00"),
  slotDuration: integer("slot_duration").notNull().default(30),
  breaks: jsonb("breaks").notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScheduleSchema = createInsertSchema(scheduleTable).omit({ id: true, updatedAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof scheduleTable.$inferSelect;
