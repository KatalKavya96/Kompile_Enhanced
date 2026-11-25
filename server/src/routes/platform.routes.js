import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { syncLimiter, cacheFor } from "../middlewares/security.middleware.js";
import {
  syncLeetcodeProfile,
  syncCodeforcesProfile,
  syncAllProfiles,
  getUserStats,
  getSpecificPlatformData,
} from "../controllers/platform.controller.js";

const router = Router();

router.route("/sync/leetcode").post(verifyJWT, syncLimiter, syncLeetcodeProfile);
router.route("/sync/codeforces").post(verifyJWT, syncLimiter, syncCodeforcesProfile);
router.route("/sync/all").post(verifyJWT, syncLimiter, syncAllProfiles);

router.route("/stats").get(verifyJWT, getUserStats);
router.route("/stats/:username").get(cacheFor(60), getUserStats);

router.route("/:platform").get(verifyJWT, getSpecificPlatformData);
router.route("/:platform/:username").get(cacheFor(60), getSpecificPlatformData);

export default router;
