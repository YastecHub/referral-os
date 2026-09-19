import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import authRoutes from "./modules/auth/auth.routes";
import referralRoutes from "./modules/referrals/referrals.routes";
import facilityRoutes from "./modules/facilities/facilities.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import voiceRoutes from "./modules/voice/voice.routes";
import multilingualRoutes from "./modules/multilingual/multilingual.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();


app.set("trust proxy", 1);

const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return true;
  if (process.env.NODE_ENV !== "production") return true;

  const allowedOrigins = (env.CLIENT_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;

  try {
    const url = new URL(origin);
    if (url.hostname.endsWith(".onrender.com") || url.hostname.endsWith(".vercel.app")) {
      return true;
    }
  } catch {
    // invalid URL format
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use(
  "/api/docs",
  swaggerUi.serve,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const host = req.get("host") || `localhost:${env.PORT}`;
    const protocol = req.protocol || "http";
    const currentUrl = `${protocol}://${host}`;
    const dynamicSpec = {
      ...swaggerSpec,
      servers: [
        { url: currentUrl, description: `Current server (${currentUrl})` },
        { url: "http://localhost:4000", description: "Port 4000 (Primary)" },
        { url: "http://localhost:4001", description: "Port 4001 (Secondary)" },
      ],
    };
    swaggerUi.setup(dynamicSpec)(req, res, next);
  }
);
app.get("/api/docs.json", (req, res) => {
  const host = req.get("host") || `localhost:${env.PORT}`;
  const protocol = req.protocol || "http";
  const currentUrl = `${protocol}://${host}`;
  res.setHeader("Content-Type", "application/json");
  res.json({
    ...swaggerSpec,
    servers: [
      { url: currentUrl, description: `Current server (${currentUrl})` },
      { url: "http://localhost:4000", description: "Port 4000 (Primary)" },
      { url: "http://localhost:4001", description: "Port 4001 (Secondary)" },
    ],
  });
});

// ── Root redirect → Swagger ─────────────────────────────────────────────────
app.get("/", (_req, res) => res.redirect("/api/docs"));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "ReferralOS" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/command-centre", analyticsRoutes);
app.use("/api/command-center", analyticsRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/multilingual", multilingualRoutes);
app.get("/api/dashboard", (req, res, next) => {
  req.url = "/dashboard";
  referralRoutes(req, res, next);
});


app.use(notFound);
app.use(errorHandler);

export default app;
