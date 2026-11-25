import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { cacheFor } from "../middlewares/security.middleware.js";
import {
  getContestEvents,
  getTodayContests,
  syncContestEvents,
} from "../controllers/contestEvent.controller.js";

const router = Router();

router.get("/contests", cacheFor(300), getContestEvents);

router.route("/contests/today").get(cacheFor(300), getTodayContests);

// Admin only: the cron job syncs every 6 hours; this forces a refresh.
router.post("/contests/sync", verifyJWT, requireRole("admin"), syncContestEvents);

export default router;
