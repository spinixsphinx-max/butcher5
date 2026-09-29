import { Router } from "express";
import { db } from "@workspace/db";
import { scheduleTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const breakSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().optional(),
});

const scheduleInputSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time format (HH:MM)"),
  slotDuration: z.number().int().min(5).max(240),
  breaks: z.array(breakSchema).optional().default([]),
});

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function getOrCreateSchedule() {
  const rows = await db.select().from(scheduleTable).limit(1);
  if (rows[0]) return rows[0];

  const [created] = await db.insert(scheduleTable).values({}).returning();
  return created;
}

// GET /schedule
router.get("/", async (req, res) => {
  try {
    const schedule = await getOrCreateSchedule();
    res.json({ ...schedule, updatedAt: schedule.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error getting schedule");
    res.status(500).json({ error: "Failed to get schedule" });
  }
});

// PUT /schedule
router.put("/", async (req, res) => {
  try {
    const parsed = scheduleInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    const data = parsed.data;

    // Validate end > start
    if (toMinutes(data.endTime) <= toMinutes(data.startTime)) {
      return res.status(400).json({ error: "End time must be after start time" });
    }

    // Validate breaks
    const workStart = toMinutes(data.startTime);
    const workEnd = toMinutes(data.endTime);

    for (let i = 0; i < data.breaks.length; i++) {
      const b = data.breaks[i];
      const bs = toMinutes(b.startTime);
      const be = toMinutes(b.endTime);

      if (be <= bs) {
        return res.status(400).json({ error: `Break ${i + 1}: end time must be after start time` });
      }
      if (bs < workStart || be > workEnd) {
        return res.status(400).json({ error: `Break ${i + 1}: must be within work hours` });
      }

      // Check overlap with other breaks
      for (let j = i + 1; j < data.breaks.length; j++) {
        const b2 = data.breaks[j];
        const bs2 = toMinutes(b2.startTime);
        const be2 = toMinutes(b2.endTime);
        if (bs < be2 && be > bs2) {
          return res.status(400).json({ error: `Breaks ${i + 1} and ${j + 1} overlap` });
        }
      }
    }

    const existing = await getOrCreateSchedule();

    const [updated] = await db
      .update(scheduleTable)
      .set({ ...data, breaks: data.breaks, updatedAt: new Date() })
      .where(eq(scheduleTable.id, existing.id))
      .returning();

    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error updating schedule");
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// GET /schedule/slots
router.get("/slots", async (req, res) => {
  try {
    const schedule = await getOrCreateSchedule();
    const breaks = (schedule.breaks as Array<{ startTime: string; endTime: string }>) || [];

    function toTime(mins: number): string {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    const start = toMinutes(schedule.startTime);
    const end = toMinutes(schedule.endTime);
    const duration = schedule.slotDuration;

    // Get bookings for date to mark availability
    const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];

    const { bookingsTable } = await import("@workspace/db");
    const { and, eq: eqOp } = await import("drizzle-orm");
    const dayBookings = await db.select().from(bookingsTable).where(
      and(eqOp(bookingsTable.bookingDate, date), eqOp(bookingsTable.status, "active"))
    );

    const slots = [];
    for (let t = start; t + duration <= end; t += duration) {
      const slotEnd = t + duration;
      const isDuringBreak = breaks.some((b) => {
        const bs = toMinutes(b.startTime);
        const be = toMinutes(b.endTime);
        return t < be && slotEnd > bs;
      });
      if (!isDuringBreak) {
        const time = toTime(t);
        // Line 1 slot
        const line1Booking = dayBookings.find((b) => b.assignedTime === time && b.assignedLine === 1);
        slots.push({
          time,
          line: 1,
          available: !line1Booking,
          bookingId: line1Booking?.id ?? null,
          customerName: line1Booking?.customerName ?? null,
        });
        // Line 2 slot
        const line2Booking = dayBookings.find((b) => b.assignedTime === time && b.assignedLine === 2);
        slots.push({
          time,
          line: 2,
          available: !line2Booking,
          bookingId: line2Booking?.id ?? null,
          customerName: line2Booking?.customerName ?? null,
        });
      }
    }

    res.json(slots);
  } catch (err) {
    req.log.error({ err }, "Error getting slots");
    res.status(500).json({ error: "Failed to get slots" });
  }
});

export default router;
