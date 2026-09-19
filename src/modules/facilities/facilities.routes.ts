import { Router, Request, Response } from "express";
import { z } from "zod";
import { AcceptingStatus, FacilityTier, Capability } from "@prisma/client";
import prisma from "../../config/prisma";
import { authenticate, requireRole } from "../../middleware/auth";

const router = Router();

// ─── GET /api/facilities ─────────────────────────────────────────────────────
router.get("/", authenticate, async (_req: Request, res: Response) => {
  const facilities = await prisma.facility.findMany({
    orderBy: { name: "asc" },
  });
  res.json(facilities);
});

// ─── GET /api/facilities/:id ─────────────────────────────────────────────────
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const facility = await prisma.facility.findUnique({
    where: { id: req.params.id },
  });

  if (!facility) {
    res.status(404).json({ error: "Facility not found" });
    return;
  }

  res.json(facility);
});

// ─── PATCH /api/facilities/:id/status ────────────────────────────────────────
const StatusSchema = z.object({
  acceptingStatus: z.nativeEnum(AcceptingStatus).optional(),
  bloodStock: z.number().int().min(0).optional(),
  specialistsOnDuty: z.number().int().min(0).optional(),
  bedsAvailable: z.number().int().min(0).optional(),
  theatreAvailable: z.boolean().optional(),
});

router.patch(
  "/:id/status",
  authenticate,
  requireRole("HOSPITAL_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const facility = await prisma.facility.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json(facility);
  }
);

// ─── POST /api/facilities (Admin only) ───────────────────────────────────────
const CreateFacilitySchema = z.object({
  name: z.string().min(2),
  tier: z.nativeEnum(FacilityTier),
  address: z.string().min(5),
  lga: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  phone: z.string().min(5),
  capabilities: z.array(z.nativeEnum(Capability)).min(1),
  acceptingStatus: z
    .nativeEnum(AcceptingStatus)
    .default(AcceptingStatus.ACCEPTING),
  bloodStock: z.number().int().min(0).default(0),
  specialistsOnDuty: z.number().int().min(0).default(0),
  bedsAvailable: z.number().int().min(0).default(0),
  theatreAvailable: z.boolean().default(false),
});

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const parsed = CreateFacilitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const facility = await prisma.facility.create({ data: parsed.data });
    res.status(201).json(facility);
  }
);

// ─── PUT /api/facilities/:id (Admin only) ────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const parsed = CreateFacilitySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const facility = await prisma.facility.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json(facility);
  }
);

// ─── DELETE /api/facilities/:id (Admin only) ─────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    await prisma.facility.delete({ where: { id: req.params.id } });
    res.json({ message: "Facility deleted" });
  }
);

export default router;
