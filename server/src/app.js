import "dotenv/config";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { apiLimiter, rejectMongoOperators } from "./middlewares/security.middleware.js";
import passport from "./config/passport.js";
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import platformRouter from "./routes/platform.routes.js";
import sheetsRouter from "./routes/sheets.route.js";
import roomRoutes from "./routes/room.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import companyRouter from "./routes/company.routes.js";
import contestEventRouter from "./routes/contestEvent.routes.js";

let app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(compression());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim().replace(/\/$/, ""))
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(rejectMongoOperators);
app.use("/api/v1", apiLimiter);
app.use(passport.initialize());

// Routes
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/platforms", platformRouter);
app.use("/api/v1/sheets", sheetsRouter);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/leaderboard", leaderboardRoutes);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/events", contestEventRouter);

app.get("/", (req, res) => {
  res.send("welcome to Kompile");
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const raw = Number(err.statusCode || err.status);
  const statusCode = raw >= 400 && raw < 600 ? raw : 500;
  if (statusCode >= 500) {
    console.error(err);
    return res.status(statusCode).json({
      success: false,
      message: "Internal Server Error",
      errors: [],
    });
  }
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Request failed",
    errors: err.errors || [],
  });
});

export default app;
