import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Capability, ReferralStatus, EventType } from "@prisma/client";
import prisma from "../../config/prisma";
import { authenticate, requireRole } from "../../middleware/auth";
import { structureNotes } from "../../engines/ai.engine";
import { rankFacilities } from "../../engines/matching.engine";
import { transition } from "../../engines/coordination.engine";
import { generateRefCode } from "./referral.helpers";

const router = Router();

const isValidObjectId = (id?: string | null): boolean =>
  typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

router.param("id", (req: Request, res: Response, next: NextFunction, id: string) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({
      error: `Invalid referral ID format: "${id}". Must be a 24-character hexadecimal ObjectId.`,
    });
    return;
  }
  next();
});

const referralInclude = {
  sendingFacility: { select: { id: true, name: true, lga: true } },
  receivingFacility: { select: { id: true, name: true, lga: true } },
  events: { orderBy: { timestamp: "asc" as const } },
  feedback: true,
};

// POST /api/referrals
const CreateSchema = z.object({
  rawNotes: z.string().min(10),
  sendingFacilityId: z.string().optional(),
});

router.post(
  "/",
  authenticate,
  requireRole("PHC_WORKER", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      // If sendingFacilityId is omitted, empty, or placeholder "string", default to authenticated user's facility
      const sendingFacilityId =
        parsed.data.sendingFacilityId && isValidObjectId(parsed.data.sendingFacilityId)
          ? parsed.data.sendingFacilityId
          : req.user!.facilityId;

      const sendingFacility = await prisma.facility.findUnique({
        where: { id: sendingFacilityId },
      });

      if (!sendingFacility) {
        res.status(404).json({ error: "Sending facility not found" });
        return;
      }

      const [structured, refCode] = await Promise.all([
        structureNotes(parsed.data.rawNotes),
        generateRefCode(),
      ]);

      const referral = await prisma.referral.create({
        data: {
          refCode,
          rawNotes: parsed.data.rawNotes,
          patientSummary: structured.patientSummary,
          patientAge: structured.patientAge,
          patientGender: structured.patientGender,
          chiefComplaint: structured.chiefComplaint,
          clinicalFindings: structured.clinicalFindings,
          urgencyTier: structured.urgencyTier,
          urgencyReason: structured.urgencyReason,
          requiredCapability: structured.requiredCapability,
          sendingFacilityId,
          status: ReferralStatus.CREATED,
        },
        include: referralInclude,
      });

      await prisma.referralEvent.create({
        data: {
          referralId: referral.id,
          eventType: EventType.CREATED,
          actorId: req.user!.userId,
        },
      });

      res.status(201).json(referral);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/referrals
router.get("/", authenticate, async (req: Request, res: Response) => {
  const { status, facilityId } = req.query;
  const where: Record<string, unknown> = {};

  if (status) where.status = status;

  if (req.user!.role !== "ADMIN") {
    where.OR = [
      { sendingFacilityId: req.user!.facilityId },
      { receivingFacilityId: req.user!.facilityId },
    ];
  } else if (facilityId) {
    where.OR = [
      { sendingFacilityId: facilityId },
      { receivingFacilityId: facilityId },
    ];
  }

  const referrals = await prisma.referral.findMany({
    where,
    include: referralInclude,
    orderBy: { createdAt: "desc" },
  });

  res.json(referrals);
});

// GET /api/referrals/incoming — active referrals for receiving hospital
router.get(
  "/incoming",
  authenticate,
  requireRole("HOSPITAL_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const referrals = await prisma.referral.findMany({
      where: {
        receivingFacilityId: req.user!.facilityId,
        status: {
          in: [
            ReferralStatus.MATCHED,
            ReferralStatus.ACCEPTED,
            ReferralStatus.TRANSPORT_REQUESTED,
            ReferralStatus.IN_TRANSIT,
            ReferralStatus.ARRIVED,
          ],
        },
      },
      include: referralInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json(referrals);
  }
);

// GET /api/referrals/:id
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const referral = await prisma.referral.findUnique({
    where: { id: req.params.id },
    include: referralInclude,
  });

  if (!referral) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }

  res.json(referral);
});

// POST /api/referrals/:id/match
router.post(
  "/:id/match",
  authenticate,
  requireRole("PHC_WORKER", "ADMIN"),
  async (req: Request, res: Response) => {
    const referral = await prisma.referral.findUnique({
      where: { id: req.params.id },
      include: { sendingFacility: true },
    });

    if (!referral) {
      res.status(404).json({ error: "Referral not found" });
      return;
    }

    if (
      referral.status !== ReferralStatus.CREATED &&
      referral.status !== ReferralStatus.REJECTED
    ) {
      res.status(422).json({ error: "Referral is not in a matchable state" });
      return;
    }

    const allFacilities = await prisma.facility.findMany();
    const candidates = rankFacilities(
      allFacilities,
      referral.requiredCapability as Capability,
      referral.sendingFacilityId,
      referral.sendingFacility.lat,
      referral.sendingFacility.lng,
      referral.urgencyTier
    );

    if (candidates.length === 0) {
      res.status(422).json({ error: "No suitable facilities found" });
      return;
    }

    const topMatch = candidates[0];
    const isRematch = referral.status === ReferralStatus.REJECTED;

    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        receivingFacilityId: topMatch.facilityId,
        matchCandidates: JSON.parse(JSON.stringify(candidates)),
        rematchCount: isRematch ? { increment: 1 } : undefined,
      },
    });

    await transition(
      referral.id,
      ReferralStatus.MATCHED,
      isRematch ? EventType.REMATCHED : EventType.MATCHED,
      req.user!.userId,
      { metadata: { candidates } }
    );

    res.json({ candidates, selectedFacilityId: topMatch.facilityId });
  }
);

// POST /api/referrals/:id/accept
router.post(
  "/:id/accept",
  authenticate,
  requireRole("HOSPITAL_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const updated = await transition(
      req.params.id,
      ReferralStatus.ACCEPTED,
      EventType.ACCEPTED,
      req.user!.userId
    );
    res.json(updated);
  }
);

// POST /api/referrals/:id/reject — reject + auto re-route
const RejectSchema = z.object({
  reason: z.string().min(1),
});

router.post(
  "/:id/reject",
  authenticate,
  requireRole("HOSPITAL_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const parsed = RejectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const referral = await prisma.referral.findUnique({
      where: { id: req.params.id },
      include: { sendingFacility: true },
    });

    if (!referral) {
      res.status(404).json({ error: "Referral not found" });
      return;
    }

    // Track which facility rejected
    const rejectedFacilityId = referral.receivingFacilityId;
    const rejectedFacilityIds = [...(referral.rejectedFacilityIds ?? [])];
    if (
      rejectedFacilityId &&
      !rejectedFacilityIds.includes(rejectedFacilityId)
    ) {
      rejectedFacilityIds.push(rejectedFacilityId);
    }

    await prisma.referral.update({
      where: { id: req.params.id },
      data: { rejectionReason: parsed.data.reason, rejectedFacilityIds },
    });

    await transition(
      req.params.id,
      ReferralStatus.REJECTED,
      EventType.REJECTED,
      req.user!.userId,
      { note: parsed.data.reason }
    );

    // ── Auto re-route to next suitable facility ──────────────────────────
    const allFacilities = await prisma.facility.findMany();
    const candidates = rankFacilities(
      allFacilities,
      referral.requiredCapability as Capability,
      referral.sendingFacilityId,
      referral.sendingFacility.lat,
      referral.sendingFacility.lng,
      referral.urgencyTier,
      rejectedFacilityIds
    );

    if (candidates.length > 0) {
      const topMatch = candidates[0];

      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          receivingFacilityId: topMatch.facilityId,
          matchCandidates: JSON.parse(JSON.stringify(candidates)),
          rematchCount: { increment: 1 },
        },
      });

      await transition(
        referral.id,
        ReferralStatus.MATCHED,
        EventType.REMATCHED,
        null,
        { metadata: { candidates, rejectedFacilityId } }
      );

      const updated = await prisma.referral.findUnique({
        where: { id: referral.id },
        include: referralInclude,
      });

      res.json({
        referral: updated,
        rerouted: true,
        newFacilityId: topMatch.facilityId,
        candidates,
      });
    } else {
      const updated = await prisma.referral.findUnique({
        where: { id: referral.id },
        include: referralInclude,
      });

      res.json({
        referral: updated,
        rerouted: false,
        message: "No suitable facilities available for re-routing",
      });
    }
  }
);

// POST /api/referrals/:id/status
// Advances: ACCEPTED → IN_TRANSIT → ARRIVED → CARE_CONFIRMED
const StatusSchema = z.object({
  status: z.nativeEnum(ReferralStatus),
  note: z.string().optional(),
});

const STATUS_TO_EVENT: Partial<Record<ReferralStatus, EventType>> = {
  [ReferralStatus.TRANSPORT_REQUESTED]: EventType.TRANSPORT_REQUESTED,
  [ReferralStatus.IN_TRANSIT]: EventType.IN_TRANSIT,
  [ReferralStatus.ARRIVED]: EventType.ARRIVED,
  [ReferralStatus.CARE_CONFIRMED]: EventType.CARE_CONFIRMED,
};

router.post(
  "/:id/status",
  authenticate,
  async (req: Request, res: Response) => {
    const parsed = StatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const eventType = STATUS_TO_EVENT[parsed.data.status];
    if (!eventType) {
      res.status(422).json({
        error: "Use dedicated endpoints for ACCEPTED, REJECTED, and FEEDBACK_SENT",
      });
      return;
    }

    const updated = await transition(
      req.params.id,
      parsed.data.status,
      eventType,
      req.user!.userId,
      { note: parsed.data.note }
    );

    res.json(updated);
  }
);

// POST /api/referrals/:id/feedback
const FeedbackSchema = z.object({
  diagnosisConfirmed: z.string().min(1),
  treatmentGiven: z.string().min(1),
  followUpRequired: z.boolean().default(false),
  followUpNote: z.string().optional(),
  outcomeStatus: z.string().optional(),
});

router.post(
  "/:id/feedback",
  authenticate,
  requireRole("HOSPITAL_STAFF", "ADMIN"),
  async (req: Request, res: Response) => {
    const parsed = FeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const referral = await prisma.referral.findUnique({
      where: { id: req.params.id },
    });

    if (!referral) {
      res.status(404).json({ error: "Referral not found" });
      return;
    }

    if (referral.status !== ReferralStatus.CARE_CONFIRMED) {
      res.status(422).json({
        error: "Feedback can only be submitted after Care Confirmed",
      });
      return;
    }

    const feedback = await prisma.feedbackNote.create({
      data: { referralId: referral.id, ...parsed.data },
    });

    await transition(
      referral.id,
      ReferralStatus.FEEDBACK_SENT,
      EventType.FEEDBACK_SENT,
      req.user!.userId
    );

    res.status(201).json(feedback);
  }
);

export default router;
