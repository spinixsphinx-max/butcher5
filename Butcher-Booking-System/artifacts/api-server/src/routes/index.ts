import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bookingsRouter from "./bookings";
import scheduleRouter from "./schedule";
import rulesRouter from "./rules";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/bookings", bookingsRouter);
router.use("/schedule", scheduleRouter);
router.use("/rules", rulesRouter);
router.use("/stats", statsRouter);

export default router;
