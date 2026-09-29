import { Router } from "express";
import { db } from "@workspace/db";
import { bookingRulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const rulesInputSchema = z.object({
  earlySlotCutoff: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxAnimalsPerCustomer: z.number().int().min(1).max(100).optional(),
  cooldownPeriodDays: z.number().int().min(0).max(365).optional(),
  maxBookingsPerDay: z.number().int().min(1).max(200).optional(),
  allowSameCustomerSameDay: z.boolean().optional(),
});

async function getOrCreateRules() {
  const rows = await db.select().from(bookingRulesTable).limit(1);
  if (rows[0]) return rows[0];

  const [created] = await db.insert(bookingRulesTable).values({}).returning();
  return created;
}

// GET /rules
router.get("/", async (req, res) => {
  try {
    const rules = await getOrCreateRules();
    res.json({ ...rules, updatedAt: rules.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error getting rules");
    res.status(500).json({ error: "Failed to get rules" });
  }
});

// PUT /rules
router.put("/", async (req, res) => {
  try {
    const parsed = rulesInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    }

    const existing = await getOrCreateRules();

    const [updated] = await db
      .update(bookingRulesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(bookingRulesTable.id, existing.id))
      .returning();

    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error updating rules");
    res.status(500).json({ error: "Failed to update rules" });
  }
});

export default router;
