import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import prisma from "../../config/prisma";
import { env } from "../../config/env";
import { authenticate, requireRole } from "../../middleware/auth";

const router = Router();

function signToken(user: { id: string; role: string; facilityId: string }) {
  return jwt.sign(
    { userId: user.id, role: user.role, facilityId: user.facilityId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

function safeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  facilityId: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    facilityId: user.facilityId,
  };
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ token: signToken(user), user: safeUser(user) });
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// PHC_WORKER  → open (no auth required)
// HOSPITAL_STAFF / ADMIN → admin only

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole).default(UserRole.PHC_WORKER),
  facilityId: z.string(),
});

router.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, email, password, role, facilityId } = parsed.data;

  // HOSPITAL_STAFF and ADMIN creation requires an authenticated admin
  if (role === UserRole.HOSPITAL_STAFF || role === UserRole.ADMIN) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(403).json({ error: "Only admins can create HOSPITAL_STAFF or ADMIN accounts" });
      return;
    }
    try {
      const payload = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as { role: string };
      if (payload.role !== UserRole.ADMIN) {
        res.status(403).json({ error: "Only admins can create HOSPITAL_STAFF or ADMIN accounts" });
        return;
      }
    } catch {
      res.status(401).json({ error: "Token invalid or expired" });
      return;
    }
  }

  // Check facility exists
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) {
    res.status(404).json({ error: "Facility not found" });
    return;
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      facilityId,
    },
  });

  res.status(201).json({ token: signToken(user), user: safeUser(user) });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { facility: { select: { id: true, name: true, tier: true, lga: true } } },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(safeUser(user));
});

// ─── GET /api/auth/users ──────────────────────────────────────────────────────
// Admin only — list all users

router.get(
  "/users",
  authenticate,
  requireRole("ADMIN"),
  async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        facilityId: true,
        createdAt: true,
        facility: { select: { id: true, name: true, tier: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  }
);

export default router;
