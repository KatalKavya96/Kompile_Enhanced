import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { ApiError } from "../utils/api-error.js";

// Blocks NoSQL operator injection such as {"email": {"$gt": ""}}: any key that
// starts with "$" or contains "." anywhere in body, query or params is rejected.
const hasOperatorKey = (value, depth = 0) => {
  if (depth > 20) return true;
  if (Array.isArray(value)) return value.some((v) => hasOperatorKey(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, v]) => key.startsWith("$") || key.includes(".") || hasOperatorKey(v, depth + 1),
    );
  }
  return false;
};

export const rejectMongoOperators = (req, res, next) => {
  if (hasOperatorKey(req.body) || hasOperatorKey(req.query) || hasOperatorKey(req.params)) {
    return next(new ApiError(400, "Invalid characters in request"));
  }
  next();
};

const limiter = (options) =>
  rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next, opts) =>
      next(new ApiError(429, opts.message || "Too many requests, please try again later.")),
    ...options,
  });

// Brute force protection on credential and email endpoints (per IP).
export const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

// Platform syncs call LeetCode/Codeforces; limit per signed-in user.
export const syncLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.SYNC_RATE_LIMIT || 5),
  keyGenerator: (req) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip)),
  message: "Too many sync requests. Please wait a few minutes.",
});

// Broad ceiling for the whole API (per IP).
export const apiLimiter = limiter({
  windowMs: 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT || 300),
});

// Cache-Control helper for read endpoints.
export const cacheFor = (seconds, scope = "public") => (req, res, next) => {
  res.set("Cache-Control", `${scope}, max-age=${seconds}`);
  next();
};
