import { Router } from "express";
import { db } from "@workspace/db";
import { bookingsTable, bookingRulesTable, scheduleTable } from "@workspace/db";
import { eq, and, like, or, desc, asc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Validation schemas
const bookingInputSchema = z.object({
  customerName: z.string().min(1).max(100).regex(/^[\p{L}\p{N}\s\-'.]+$/u, "Invalid characters in name"),
  phoneNumber: z.string().min(7).max(20).regex(/^[+\d\s\-()]+$/, "Invalid phone number format"),
  animalType: z.string().min(1).max(50).regex(/^[\p{L}\s\-]+$/u, "Invalid characters in animal type"),
  animalCount: z.number().int().min(1).max(50),
  notes: z.string().max(500).optional(),
  bookingDate: z.string().optional(),
});

const bookingUpdateSchema = z.object({
  customerName: z.string().min(1).max(100).regex(/^[\p{L}\p{N}\s\-'.]+$/u).optional(),
  phoneNumber: z.string().min(7).max(20).regex(/^[+\d\s\-()]+$/).optional(),
  animalType: z.string().min(1).max(50).regex(/^[\p{L}\s\-]+$/u).optional(),
  animalCount: z.number().int().min(1).max(50).optional(),
  notes: z.string().max(500).optional(),
  assignedLine: z.number().int().min(1).max(2).nullable().optional(),
  assignedTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  bookingDate: z.string().optional(),
});

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// GET /bookings
router.get("/", async (req, res) => {
  try {
    const { status, date, search, line } = req.query;

    let bookings = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt));

    if (status && typeof status === "string") {
      bookings = bookings.filter((b) => b.status === status);
    }
    if (date && typeof date === "string") {
      bookings = bookings.filter((b) => b.bookingDate === date);
    }
    if (search && typeof search === "string") {
      const s = search.toLowerCase();
      bookings = bookings.filter(
        (b) =>
          b.customerName.toLowerCase().includes(s) ||
          b.phoneNumber.includes(s) ||
          b.animalType.toLowerCase().includes(s)
      );
    }
    if (line && typeof line === "string") {
      const lineNum = parseInt(line, 10);
      if (!isNaN(lineNum)) {
        bookings = bookings.filter((b) => b.assignedLine === lineNum);
      }
    }

    res.json(
      bookings.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing bookings");
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// POST /bookings
router.post("/", async (req, res) => {
  try {
    const parsed = bookingInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    const data = parsed.data;
    const bookingDate = data.bookingDate || getTodayDate();

    // Check rules
    const rules = await db.select().from(bookingRulesTable).limit(1);
    const rule = rules[0];

    if (rule) {
      if (data.animalCount > rule.maxAnimalsPerCustomer) {
        return res.status(400).json({ error: `Maximum ${rule.maxAnimalsPerCustomer} animals per customer` });
      }

      // Check daily limit
      const dayBookings = await db.select().from(bookingsTable).where(
        and(eq(bookingsTable.bookingDate, bookingDate), eq(bookingsTable.status, "active"))
      );
      if (dayBookings.length >= rule.maxBookingsPerDay) {
        return res.status(400).json({ error: `Daily booking limit of ${rule.maxBookingsPerDay} reached` });
      }

      // Check same customer same day
      if (!rule.allowSameCustomerSameDay) {
        const sameDay = dayBookings.filter(
          (b) => b.customerName.toLowerCase() === data.customerName.toLowerCase()
        );
        if (sameDay.length > 0) {
          return res.status(409).json({ error: "Customer already has a booking today" });
        }
      }

      // Check cooldown
      if (rule.cooldownPeriodDays > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - rule.cooldownPeriodDays);
        const recentBookings = await db.select().from(bookingsTable);
        const recent = recentBookings.filter(
          (b) =>
            b.customerName.toLowerCase() === data.customerName.toLowerCase() &&
            new Date(b.bookingDate) >= cutoff &&
            b.bookingDate !== bookingDate
        );
        if (recent.length > 0) {
          return res.status(409).json({ error: `Customer had a booking within the last ${rule.cooldownPeriodDays} days` });
        }
      }
    }

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        customerName: data.customerName,
        phoneNumber: data.phoneNumber,
        animalType: data.animalType,
        animalCount: data.animalCount,
        notes: data.notes || null,
        status: "active",
        bookingDate,
        earlySlotCount: 0,
      })
      .returning();

    res.status(201).json({
      ...booking,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating booking");
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// POST /bookings/allocate
router.post("/allocate", async (req, res) => {
  try {
    const body = z.object({ date: z.string().optional(), forceReallocate: z.boolean().optional() }).safeParse(req.body);
    const date = (body.success && body.data.date) ? body.data.date : getTodayDate();
    const forceReallocate = body.success ? (body.data.forceReallocate ?? false) : false;

    // Get schedule
    const schedules = await db.select().from(scheduleTable).limit(1);
    if (!schedules[0]) {
      return res.status(400).json({ error: "No schedule configured" });
    }
    const schedule = schedules[0];

    // Generate time slots
    const slots = generateSlots(schedule);

    // Get active bookings for date
    let bookings = await db.select().from(bookingsTable).where(
      and(eq(bookingsTable.bookingDate, date), eq(bookingsTable.status, "active"))
    );

    if (!forceReallocate) {
      bookings = bookings.filter((b) => !b.assignedLine || !b.assignedTime);
    }

    if (bookings.length === 0) {
      const all = await db.select().from(bookingsTable).where(
        and(eq(bookingsTable.bookingDate, date), eq(bookingsTable.status, "active"))
      );
      return res.json(all.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() })));
    }

    // Get rules for early slot fairness
    const rules = await db.select().from(bookingRulesTable).limit(1);
    const rule = rules[0];
    const earlySlotCutoff = rule?.earlySlotCutoff || "09:00";

    // Fair random allocation with cooldown for early slots
    const shuffled = fairShuffle(bookings, earlySlotCutoff);

    // Assign slots: alternate between line 1 and line 2
    const line1Slots = slots.filter((_, i) => i % 2 === 0);
    const line2Slots = slots.filter((_, i) => i % 2 === 1);

    const updatedBookings = [];
    for (let i = 0; i < shuffled.length; i++) {
      const booking = shuffled[i];
      const isLine1 = i % 2 === 0;
      const lineSlots = isLine1 ? line1Slots : line2Slots;
      const slotIndex = Math.floor(i / 2);
      const slot = lineSlots[slotIndex];

      if (!slot) continue;

      const isEarlySlot = slot < earlySlotCutoff;
      const newEarlyCount = isEarlySlot ? (booking.earlySlotCount || 0) + 1 : (booking.earlySlotCount || 0);

      const [updated] = await db
        .update(bookingsTable)
        .set({
          assignedLine: isLine1 ? 1 : 2,
          assignedTime: slot,
          slotOrder: i + 1,
          earlySlotCount: newEarlyCount,
          updatedAt: new Date(),
        })
        .where(eq(bookingsTable.id, booking.id))
        .returning();

      updatedBookings.push({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
    }

    res.json(updatedBookings);
  } catch (err) {
    req.log.error({ err }, "Error allocating slots");
    res.status(500).json({ error: "Failed to allocate slots" });
  }
});

// GET /bookings/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({ ...booking, createdAt: booking.createdAt.toISOString(), updatedAt: booking.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error getting booking");
    res.status(500).json({ error: "Failed to get booking" });
  }
});

// PATCH /bookings/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const parsed = bookingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    const data = parsed.data;

    // Check for slot conflict if line/time being changed
    if (data.assignedLine && data.assignedTime) {
      const bookingDate = req.body.bookingDate;
      const conflict = await db.select().from(bookingsTable).where(
        and(
          eq(bookingsTable.assignedLine, data.assignedLine),
          eq(bookingsTable.assignedTime, data.assignedTime),
          eq(bookingsTable.status, "active")
        )
      );
      const realConflict = conflict.filter((b) => b.id !== id);
      if (realConflict.length > 0) {
        return res.status(409).json({ error: "That line/time slot is already taken" });
      }
    }

    const [booking] = await db
      .update(bookingsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({ ...booking, createdAt: booking.createdAt.toISOString(), updatedAt: booking.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error updating booking");
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// DELETE /bookings/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [deleted] = await db.delete(bookingsTable).where(eq(bookingsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Booking not found" });

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting booking");
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// POST /bookings/:id/complete
router.post("/:id/complete", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [booking] = await db
      .update(bookingsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({ ...booking, createdAt: booking.createdAt.toISOString(), updatedAt: booking.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error completing booking");
    res.status(500).json({ error: "Failed to complete booking" });
  }
});

// POST /bookings/:id/cancel
router.post("/:id/cancel", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [booking] = await db
      .update(bookingsTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({ ...booking, createdAt: booking.createdAt.toISOString(), updatedAt: booking.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error cancelling booking");
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// Helper: generate time slots from schedule
function generateSlots(schedule: { startTime: string; endTime: string; slotDuration: number; breaks: unknown }): string[] {
  const breaks = (schedule.breaks as Array<{ startTime: string; endTime: string }>) || [];

  function toMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function toTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);
  const duration = schedule.slotDuration;

  const slots: string[] = [];
  for (let t = start; t + duration <= end; t += duration) {
    const slotEnd = t + duration;
    const isDuringBreak = breaks.some((b) => {
      const bs = toMinutes(b.startTime);
      const be = toMinutes(b.endTime);
      return t < be && slotEnd > bs;
    });
    if (!isDuringBreak) {
      slots.push(toTime(t));
    }
  }
  return slots;
}

// Helper: fair shuffle respecting early slot cooldown
function fairShuffle(bookings: typeof bookingsTable.$inferSelect[], earlySlotCutoff: string) {
  // Sort: fewer early slots first to ensure fair distribution, then randomize ties
  const withRandom = bookings.map((b) => ({ b, r: Math.random() }));
  withRandom.sort((a, b) => {
    if (a.b.earlySlotCount !== b.b.earlySlotCount) {
      return a.b.earlySlotCount - b.b.earlySlotCount;
    }
    return a.r - b.r;
  });
  return withRandom.map((x) => x.b);
}

export default router;
