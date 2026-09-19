import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app";
import { env } from "./config/env";
import { initSocket } from "./config/socket";
import { JwtPayload } from "./types";

const httpServer = createServer(app);

const isOriginAllowed = (origin: string | undefined): boolean => {
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

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST"],
  },
});

initSocket(io);

io.on("connection", (socket) => {
  const token =
    socket.handshake.auth?.token ??
    (socket.handshake.headers?.authorization as string | undefined)?.replace(
      "Bearer ",
      ""
    );

  if (!token) {
    console.warn("[Socket] Connection rejected — no token");
    socket.disconnect(true);
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Join facility-specific room
    socket.join(`facility:${payload.facilityId}`);

    // Admins also join the admin room for command-centre updates
    if (payload.role === "ADMIN") {
      socket.join("admin");
    }

    console.log(
      `[Socket] ${payload.role} connected: ${socket.id} → facility:${payload.facilityId}`
    );

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  } catch {
    console.warn("[Socket] Connection rejected — invalid token");
    socket.disconnect(true);
  }
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${env.PORT} is already in use by another process.`);
    console.error(`👉 Stop any background process on port ${env.PORT} or change PORT in .env`);
    process.exit(1);
  } else {
    console.error("❌ Server failed to start:", err.message);
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason: any) => {
  console.error("⚠️  [Unhandled Rejection]:", reason?.message || reason);
});

process.on("uncaughtException", (err: Error) => {
  console.error("⚠️  [Uncaught Exception]:", err?.message || err);
});

const HOST = "0.0.0.0";
httpServer.listen(env.PORT, HOST, () => {
  console.log(`🚀  ReferralOS API running on port ${env.PORT} (${HOST})`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   AI Provider : ${env.AI_PROVIDER}`);
  console.log(`   Swagger Docs: http://localhost:${env.PORT}/api/docs`);
});
