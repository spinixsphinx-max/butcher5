import { Router } from "express";
import { db } from "@workspace/db";
import { bookingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// GET /stats/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : getTodayDate();

    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.bookingDate, date));

    const active = bookings.filter((b) => b.status === "active");
    const completed = bookings.filter((b) => b.status === "completed");
    const line1 = active.filter((b) => b.assignedLine === 1);
    const line2 = active.filter((b) => b.assignedLine === 2);
    const totalAnimals = active.reduce((sum, b) => sum + b.animalCount, 0);

    res.json({
      totalBookingsToday: bookings.filter((b) => b.status !== "cancelled").length,
      totalCompleted: completed.length,
      remaining: active.length,
      totalAnimals,
      line1Count: line1.length,
      line2Count: line2.length,
      date,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting dashboard stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /stats/lines
router.get("/lines", async (req, res) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : getTodayDate();

    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.bookingDate, date));

    const lineStats = [1, 2].map((line) => {
      const lineBookings = bookings.filter((b) => b.assignedLine === line);
      const completed = lineBookings.filter((b) => b.status === "completed");
      const active = lineBookings.filter((b) => b.status === "active");
      return {
        line,
        totalBookings: lineBookings.filter((b) => b.status !== "cancelled").length,
        completed: completed.length,
        remaining: active.length,
        totalAnimals: active.reduce((sum, b) => sum + b.animalCount, 0),
      };
    });

    res.json(lineStats);
  } catch (err) {
    req.log.error({ err }, "Error getting line stats");
    res.status(500).json({ error: "Failed to get line stats" });
  }
});

export default router;
