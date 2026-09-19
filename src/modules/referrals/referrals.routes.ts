import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Capability, ReferralStatus, EventType, UrgencyTier } from "@prisma/client";
import prisma from "../../config/prisma";
import { optionalAuthenticate, authenticate, requireRole } from "../../middleware/auth";
import { structureNotes } from "../../engines/ai.engine";
import {
  rankFacilities,
  normalizeCapabilities,
  normalizeCapability,
} from "../../engines/matching.engine";
import { transition } from "../../engines/coordination.engine";
import { generateRefCode } from "./referral.helpers";
import { FALLBACK_FACILITIES } from "../facilities/facilities.routes";

const router = Router();

const isValidObjectId = (id?: string | null): boolean =>
  typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

router.param("id", (req: Request, res: Response, next: NextFunction, id: string) => {
  // Allow fetching by refCode or ObjectId
  if (!isValidObjectId(id) && !id.startsWith("REF-")) {
    res.status(400).json({
      error: `Invalid referral identifier format: "${id}". Must be a 24-character hexadecimal ObjectId or RefCode.`,
    });
    return;
  }
  next();
});

const referralInclude = {
  sendingFacility: {
    select: {
      id: true,
      name: true,
      tier: true,
      lga: true,
      address: true,
      lat: true,
      lng: true,
      phone: true,
      acceptingStatus: true,
      bloodStock: true,
      bedsAvailable: true,
      specialistsOnDuty: true,
      theatreAvailable: true,
    },
  },
  receivingFacility: {
    select: {
      id: true,
      name: true,
      tier: true,
      lga: true,
      address: true,
      lat: true,
      lng: true,
      phone: true,
      acceptingStatus: true,
      bloodStock: true,
      bedsAvailable: true,
      specialistsOnDuty: true,
      theatreAvailable: true,
    },
  },
  events: { orderBy: { timestamp: "asc" as const } },
  feedback: true,
};

// ─── Format helper for frontend clarity ───────────────────────────────────────
function formatReferral(r: any) {
  const urgencyLabel =
    r.urgencyTier === UrgencyTier.CRITICAL
      ? "Emergency"
      : r.urgencyTier === UrgencyTier.HIGH
      ? "Urgent"
      : "Routine";

  const statusLabel =
    r.status === ReferralStatus.MATCHED
      ? "Facility Identified"
      : r.status;

  const reqCaps =
    Array.isArray(r.requiredCapabilities) && r.requiredCapabilities.length > 0
      ? r.requiredCapabilities
      : [r.requiredCapability];

  return {
    ...r,
    referralId: r.id,
    patientReference: r.refCode,
    patientName: r.patientName ?? null,
    age: r.patientAge ?? null,
    sex: r.patientGender ?? null,
    gender: r.patientGender ?? null,
    urgency: urgencyLabel,
    urgencyTier: r.urgencyTier,
    requirements: reqCaps,
    requiredCapabilities: reqCaps,
    clinicalInformation:
      r.patientSummary || r.clinicalFindings || r.chiefComplaint || r.rawNotes || "",
    currentStatus: r.status,
    statusLabel,
    timeReceived: r.createdAt,
  };
}

// ─── POST /api/referrals/ai-assist (AI Parse Note before sending) ──────────────
// User writes quick/messy note, AI structures into referral fields, user reviews it
const AiAssistSchema = z.object({
  notes: z.string().min(5).optional(),
  rawNotes: z.string().min(5).optional(),
});

router.post(
  "/ai-assist",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = AiAssistSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Please provide clinical notes in 'notes' or 'rawNotes'" });
        return;
      }

      const noteText = parsed.data.notes || parsed.data.rawNotes || "";
      const structured = await structureNotes(noteText);

      const urgencyLabel =
        structured.urgencyTier === UrgencyTier.CRITICAL
          ? "Emergency"
          : structured.urgencyTier === UrgencyTier.HIGH
          ? "Urgent"
          : "Routine";

      res.json({
        patientName: structured.patientName ?? null,
        age: structured.patientAge ?? null,
        patientAge: structured.patientAge ?? null,
        gender: structured.patientGender ?? null,
        patientGender: structured.patientGender ?? null,
        urgency: urgencyLabel,
        urgencyTier: structured.urgencyTier,
        urgencyReason: structured.urgencyReason,
        requiredCapabilities: structured.requiredCapabilities ?? [
          "Emergency obstetric",
        ],
        requiredCapability: structured.requiredCapability,
        chiefComplaint: structured.chiefComplaint ?? null,
        clinicalFindings: structured.clinicalFindings ?? null,
        patientSummary: structured.patientSummary,
        notes: noteText,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Alias
router.post("/parse-notes", optionalAuthenticate, (req, res, next) => {
  (router as any).handle(
    { ...req, url: "/ai-assist", method: "POST" },
    res,
    next
  );
});

// ─── POST /api/referrals/match-candidates (Pre-referral matching preview) ─────
const MatchCandidatesSchema = z.object({
  urgency: z.string().optional(),
  urgencyTier: z.string().optional(),
  requiredCapabilities: z.union([z.string(), z.array(z.string())]).optional(),
  sendingFacilityId: z.string().optional(),
});

router.post(
  "/match-candidates",
  optionalAuthenticate,
  async (req: Request, res: Response) => {
    const parsed = MatchCandidatesSchema.safeParse(req.body);
    const data = parsed.success ? parsed.data : {};

    let sendingFacility: any = null;
    const sendingFacilityId = data.sendingFacilityId || (req as any).user?.facilityId;

    try {
      const fetchFacility = sendingFacilityId && isValidObjectId(sendingFacilityId)
        ? prisma.facility.findUnique({ where: { id: sendingFacilityId } })
        : prisma.facility.findFirst();

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2000)
      );

      sendingFacility = await Promise.race([fetchFacility, timeout]);
    } catch {}

    if (!sendingFacility) {
      sendingFacility = FALLBACK_FACILITIES[0];
    }

    const urgencyInput = (data.urgency || data.urgencyTier || "MEDIUM").toUpperCase();
    const urgencyTier =
      urgencyInput === "EMERGENCY" || urgencyInput === "CRITICAL"
        ? UrgencyTier.CRITICAL
        : urgencyInput === "URGENT" || urgencyInput === "HIGH"
        ? UrgencyTier.HIGH
        : UrgencyTier.MEDIUM;

    const caps = data.requiredCapabilities || ["Emergency obstetric"];

    let allFacilities: any[] = [];
    try {
      const fetchAll = prisma.facility.findMany();
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2000)
      );
      allFacilities = await Promise.race([fetchAll, timeout]);
    } catch {
      allFacilities = FALLBACK_FACILITIES as any[];
    }

    if (!allFacilities || allFacilities.length === 0) {
      allFacilities = FALLBACK_FACILITIES as any[];
    }

    const candidates = rankFacilities(
      allFacilities,
      caps,
      sendingFacility.id,
      sendingFacility.lat,
      sendingFacility.lng,
      urgencyTier
    );

    res.json({ candidates });
  }
);


// ─── POST /api/referrals (Create Referral: Normal Form OR AI Method) ──────────
const CreateSchema = z.object({
  // Normal form fields
  patientName: z.string().optional(),
  age: z.union([z.number(), z.string()]).optional(),
  patientAge: z.union([z.number(), z.string()]).optional(),
  gender: z.string().optional(),
  patientGender: z.string().optional(),
  urgency: z.string().optional(),
  urgencyTier: z.nativeEnum(UrgencyTier).optional(),
  requiredCapabilities: z
    .union([z.string(), z.array(z.string())])
    .optional(),
  requiredCapability: z.string().optional(),
  notes: z.string().optional(),
  rawNotes: z.string().optional(),
  chiefComplaint: z.string().optional(),
  clinicalFindings: z.string().optional(),
  patientSummary: z.string().optional(),
  sendingFacilityId: z.string().optional(),
  receivingFacilityId: z.string().optional(),
});

router.post(
  "/",
  authenticate,
  requireRole("PHC_WORKER", "HOSPITAL_STAFF", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      const input = parsed.data;
      const rawNotesInput = input.rawNotes || input.notes;

      // Determine sending facility
      const sendingFacilityId =
        input.sendingFacilityId && isValidObjectId(input.sendingFacilityId)
          ? input.sendingFacilityId
          : req.user!.facilityId;

      const sendingFacility = await prisma.facility.findUnique({
        where: { id: sendingFacilityId },
      });

      if (!sendingFacility) {
        res.status(404).json({ error: "Sending facility not found" });
        return;
      }

      // If user supplied pure raw notes and left structured fields empty, trigger AI structuring
      let structuredFromAI: any = null;
      if (rawNotesInput && !input.patientName && !input.patientSummary && !input.urgency && !input.urgencyTier) {
        structuredFromAI = await structureNotes(rawNotesInput);
      }

      // Resolve Patient Name
      const patientName =
        input.patientName || structuredFromAI?.patientName || null;

      // Resolve Age
      const rawAge = input.patientAge ?? input.age ?? structuredFromAI?.patientAge ?? null;
      const patientAge = rawAge ? parseInt(String(rawAge), 10) : null;

      // Resolve Gender
      const rawGender = input.patientGender || input.gender || structuredFromAI?.patientGender || null;
      let patientGender = rawGender ? String(rawGender).trim() : null;
      if (patientGender) {
        if (/^f/i.test(patientGender)) patientGender = "Female";
        else if (/^m/i.test(patientGender)) patientGender = "Male";
      }

      // Resolve Urgency (Emergency -> CRITICAL, Urgent -> HIGH, Routine -> MEDIUM)
      let urgencyTier: UrgencyTier = UrgencyTier.MEDIUM;
      const urgencyStr = (input.urgencyTier || input.urgency || structuredFromAI?.urgencyTier || "MEDIUM")
        .toString()
        .toUpperCase();

      if (urgencyStr === "EMERGENCY" || urgencyStr === "CRITICAL") {
        urgencyTier = UrgencyTier.CRITICAL;
      } else if (urgencyStr === "URGENT" || urgencyStr === "HIGH") {
        urgencyTier = UrgencyTier.HIGH;
      } else {
        urgencyTier = UrgencyTier.MEDIUM;
      }

      // Resolve Capabilities
      let capsInput: string[] = [];
      if (input.requiredCapabilities) {
        capsInput = Array.isArray(input.requiredCapabilities)
          ? input.requiredCapabilities
          : [input.requiredCapabilities];
      } else if (input.requiredCapability) {
        capsInput = [input.requiredCapability];
      } else if (structuredFromAI?.requiredCapabilities?.length) {
        capsInput = structuredFromAI.requiredCapabilities;
      } else if (structuredFromAI?.requiredCapability) {
        capsInput = [structuredFromAI.requiredCapability];
      } else {
        capsInput = ["Emergency obstetric"];
      }

      const normalizedEnums = normalizeCapabilities(capsInput);
      const primaryCapability: Capability =
        normalizedEnums[0] ?? Capability.OBSTETRIC_EMERGENCY;

      // Clinical information summary
      const chiefComplaint = input.chiefComplaint || structuredFromAI?.chiefComplaint || null;
      const clinicalFindings = input.clinicalFindings || structuredFromAI?.clinicalFindings || null;
      const notes = rawNotesInput || structuredFromAI?.patientSummary || "Referral created via form";
      const patientSummary =
        input.patientSummary ||
        structuredFromAI?.patientSummary ||
        `${patientName ? patientName + ", " : ""}${patientAge ? patientAge + "yo " : ""}${patientGender || "Patient"}. ${chiefComplaint ? chiefComplaint + ". " : ""}${clinicalFindings || notes}`;

      const urgencyReason =
        structuredFromAI?.urgencyReason ||
        (urgencyTier === UrgencyTier.CRITICAL
          ? "Critical emergency maternal referral"
          : urgencyTier === UrgencyTier.HIGH
          ? "Urgent care referral"
          : "Routine specialist referral");

      const [refCode] = await Promise.all([generateRefCode()]);

      // Receiving facility if directly specified
      const receivingFacilityId =
        input.receivingFacilityId && isValidObjectId(input.receivingFacilityId)
          ? input.receivingFacilityId
          : null;

      const initialStatus = receivingFacilityId
        ? ReferralStatus.MATCHED
        : ReferralStatus.CREATED;

      const referral = await prisma.referral.create({
        data: {
          refCode,
          patientName,
          rawNotes: notes,
          patientSummary,
          patientAge,
          patientGender,
          chiefComplaint,
          clinicalFindings,
          urgencyTier,
          urgencyReason,
          requiredCapability: primaryCapability,
          requiredCapabilities: capsInput,
          sendingFacilityId,
          receivingFacilityId,
          status: initialStatus,
        },
        include: referralInclude,
      });

      await prisma.referralEvent.create({
        data: {
          referralId: referral.id,
          eventType: EventType.CREATED,
          actorId: req.user!.userId,
          note: `Referral created for ${patientName || "Patient"} (${urgencyTier})`,
        },
      });

      if (receivingFacilityId) {
        await prisma.referralEvent.create({
          data: {
            referralId: referral.id,
            eventType: EventType.MATCHED,
            actorId: req.user!.userId,
            note: "Receiving facility selected at creation",
          },
        });
      }

      res.status(201).json(formatReferral(referral));
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/referrals/dashboard (Facility Dashboard stats & categorized lists)
const handleDashboard = async (req: Request, res: Response) => {
  const queryFacId = req.query.facilityId as string | undefined;
  const facilityId =
    queryFacId && (isValidObjectId(queryFacId) || queryFacId.startsWith("fac_"))
      ? queryFacId
      : (req as any).user?.facilityId || "fac_surulere_phc";

  try {
    const fetchFacility = prisma.facility.findFirst({
      where: {
        OR: [
          { id: facilityId },
          { name: { contains: facilityId, mode: "insensitive" } },
        ],
      },
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB Timeout")), 2500)
    );

    const facility = await Promise.race([fetchFacility, timeout]);

    if (!facility) {
      throw new Error("Facility not found in DB");
    }

    // Fetch all referrals connected to this facility
    const referrals = await prisma.referral.findMany({
      where: {
        OR: [{ sendingFacilityId: facility.id }, { receivingFacilityId: facility.id }],
      },
      include: referralInclude,
      orderBy: { createdAt: "desc" },
    });

    const formattedList = referrals.map(formatReferral);

    // Sent & Received
    const sentReferrals = formattedList.filter((r) => r.sendingFacilityId === facility.id);
    const receivedReferrals = formattedList.filter(
      (r) => r.receivingFacilityId === facility.id
    );

    // Active vs Past
    const activeReferrals = formattedList.filter(
      (r) =>
        r.status !== ReferralStatus.FEEDBACK_SENT &&
        r.status !== ReferralStatus.REJECTED
    );

    const pastReferrals = formattedList.filter(
      (r) =>
        r.status === ReferralStatus.FEEDBACK_SENT ||
        r.status === ReferralStatus.REJECTED
    );

    // Dynamic Dashboard Stats:
    // 1. Awaiting Response count (incoming referrals in CREATED or MATCHED state)
    const awaitingResponse = receivedReferrals.filter(
      (r) =>
        r.status === ReferralStatus.CREATED || r.status === ReferralStatus.MATCHED
    ).length;

    // 2. Urgent count (Emergency/Urgent across active cases for this facility)
    const urgentCount = formattedList.filter(
      (r) =>
        (r.urgencyTier === UrgencyTier.CRITICAL ||
          r.urgencyTier === UrgencyTier.HIGH) &&
        r.status !== ReferralStatus.FEEDBACK_SENT &&
        r.status !== ReferralStatus.REJECTED
    ).length;

    // 3. Accepted Today count
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const acceptedToday = receivedReferrals.filter((r) => {
      const isAcceptedOrBeyond = [
        ReferralStatus.ACCEPTED,
        ReferralStatus.TRANSPORT_REQUESTED,
        ReferralStatus.IN_TRANSIT,
        ReferralStatus.ARRIVED,
        ReferralStatus.CARE_CONFIRMED,
        ReferralStatus.FEEDBACK_SENT,
      ].includes(r.status);

      if (!isAcceptedOrBeyond) return false;
      const acceptEvent = r.events?.find((e: any) => e.eventType === EventType.ACCEPTED);
      const dateToCheck = acceptEvent ? new Date(acceptEvent.timestamp) : new Date(r.updatedAt);
      return dateToCheck >= startOfDay;
    }).length;

    res.json({
      facility: {
        id: facility.id,
        facilityId: facility.id,
        name: facility.name,
        facilityName: facility.name,
        tier: facility.tier,
        tierLabel:
          facility.tier === "PHC"
            ? "Tier 1 — PHC"
            : facility.tier === "SECONDARY"
            ? "Tier 2 — Secondary"
            : "Tier 3 — Tertiary",
        location: `${facility.lga}, Lagos`,
        address: facility.address,
        phone: facility.phone,
        availability:
          facility.acceptingStatus === "ACCEPTING" ? "Available" : "Not Available",
        acceptingStatus: facility.acceptingStatus,
        readiness: {
          blood: `${facility.bloodStock} units available`,
          bloodStock: facility.bloodStock,
          specialistsOnDuty: facility.specialistsOnDuty,
          bedsAvailable: facility.bedsAvailable,
          theatreAvailable: facility.theatreAvailable,
        },
        capabilities: facility.capabilities,
      },
      stats: {
        awaitingResponse,
        acceptedToday,
        urgentCount,
        activeCount: activeReferrals.length,
        completedCount: pastReferrals.filter(
          (r) => r.status === ReferralStatus.FEEDBACK_SENT
        ).length,
        totalSent: sentReferrals.length,
        totalReceived: receivedReferrals.length,
      },
      sentReferrals,
      receivedReferrals,
      incomingReferrals: receivedReferrals,
      activeReferrals,
      pastReferrals,
    });
  } catch (_err) {
    const selectedFallback =
      FALLBACK_FACILITIES.find(
        (f) =>
          f.id === facilityId ||
          f.name.toLowerCase().includes(String(facilityId).toLowerCase())
      ) || FALLBACK_FACILITIES[0];

    const mockReferrals = [
      {
        id: "ref_001",
        referralId: "ref_001",
        refCode: "REF-2026-001",
        patientReference: "REF-2026-001",
        patientName: "Amina Lawal",
        patientAge: 26,
        age: 26,
        patientGender: "Female",
        sex: "FEMALE",
        gender: "Female",
        urgency: "Emergency",
        urgencyTier: UrgencyTier.CRITICAL,
        requirements: ["Emergency obstetric", "Blood transfusion"],
        requiredCapabilities: ["Emergency obstetric", "Blood transfusion"],
        clinicalInformation: "Severe pre-eclampsia with impending eclampsia, BP 170/110 mmHg, 3+ proteinuria.",
        currentStatus: ReferralStatus.IN_TRANSIT,
        status: ReferralStatus.IN_TRANSIT,
        statusLabel: "In Transit",
        sendingFacilityId: "fac_surulere_phc",
        receivingFacilityId: "fac_lagos_general",
        sendingFacility: { id: "fac_surulere_phc", name: "Surulere PHC", lga: "Surulere" },
        receivingFacility: { id: "fac_lagos_general", name: "Lagos General Hospital", lga: "Lagos Island" },
        createdAt: new Date().toISOString(),
        timeReceived: new Date().toISOString(),
      },
      {
        id: "ref_002",
        referralId: "ref_002",
        refCode: "REF-2026-002",
        patientReference: "REF-2026-002",
        patientName: "Bisi Adeleke",
        patientAge: 31,
        age: 31,
        patientGender: "Female",
        sex: "FEMALE",
        gender: "Female",
        urgency: "Urgent",
        urgencyTier: UrgencyTier.HIGH,
        requirements: ["Theater", "Maternal ICU"],
        requiredCapabilities: ["Theater", "Maternal ICU"],
        clinicalInformation: "Obstructed labour secondary to CPD. FHR 118 bpm.",
        currentStatus: ReferralStatus.CREATED,
        status: ReferralStatus.CREATED,
        statusLabel: "Facility Identified",
        sendingFacilityId: "fac_mushin_phc",
        receivingFacilityId: "fac_surulere_phc",
        sendingFacility: { id: "fac_mushin_phc", name: "Mushin PHC", lga: "Mushin" },
        receivingFacility: { id: "fac_surulere_phc", name: "Surulere PHC", lga: "Surulere" },
        createdAt: new Date().toISOString(),
        timeReceived: new Date().toISOString(),
      },
    ];

    res.json({
      facility: {
        id: selectedFallback.id,
        facilityId: selectedFallback.id,
        name: selectedFallback.name,
        facilityName: selectedFallback.name,
        tier: selectedFallback.tier,
        tierLabel: selectedFallback.tier === "PHC" ? "Tier 1 — PHC" : "Tier 2 — Secondary",
        location: `${selectedFallback.lga}, Lagos`,
        address: selectedFallback.address,
        phone: selectedFallback.phone,
        availability: "Available",
        acceptingStatus: "ACCEPTING",
        readiness: {
          blood: `${selectedFallback.bloodStock} units available`,
          bloodStock: selectedFallback.bloodStock,
          specialistsOnDuty: selectedFallback.specialistsOnDuty,
          bedsAvailable: selectedFallback.bedsAvailable,
          theatreAvailable: selectedFallback.theatreAvailable,
        },
        capabilities: selectedFallback.capabilities,
      },
      stats: {
        awaitingResponse: 1,
        acceptedToday: 1,
        urgentCount: 2,
        activeCount: 2,
        completedCount: 1,
        totalSent: 1,
        totalReceived: 1,
      },
      sentReferrals: [mockReferrals[0]],
      receivedReferrals: [mockReferrals[1]],
      incomingReferrals: [mockReferrals[1]],
      activeReferrals: mockReferrals,
      pastReferrals: [],
    });
  }
};

router.get("/dashboard", optionalAuthenticate, handleDashboard);
router.get("/stats", optionalAuthenticate, handleDashboard);

// ─── GET /api/referrals/incoming (Incoming referrals for receiving facility) ───
router.get(
  "/incoming",
  optionalAuthenticate,
  async (req: Request, res: Response) => {
    const facilityId =
      (req.query.facilityId as string) || (req as any).user?.facilityId || "fac_surulere_phc";

    try {
      const fetchIncoming = prisma.referral.findMany({
        where: {
          receivingFacilityId: facilityId,
          status: {
            in: [
              ReferralStatus.CREATED,
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

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2500)
      );

      const referrals = await Promise.race([fetchIncoming, timeout]);
      res.json(referrals.map(formatReferral));
    } catch {
      res.json([
        {
          id: "ref_incoming_001",
          referralId: "ref_incoming_001",
          patientReference: "REF-2026-IN01",
          patientName: "Fatima Bello",
          age: 29,
          sex: "FEMALE",
          gender: "Female",
          urgency: "Emergency",
          urgencyTier: "CRITICAL",
          requirements: ["Emergency obstetric", "Blood transfusion"],
          requiredCapabilities: ["Emergency obstetric", "Blood transfusion"],
          clinicalInformation: "Severe eclampsia with 2 antepartum seizures. Unconscious, fetal bradycardia.",
          currentStatus: "CREATED",
          status: "CREATED",
          statusLabel: "Facility Identified",
          timeReceived: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          sendingFacility: {
            id: "fac_mushin_phc",
            name: "Mushin PHC",
            tier: "Tier 1 — PHC",
            location: "Mushin, Lagos",
            phone: "+234-803-100-0002",
          },
          receivingFacility: {
            id: "fac_surulere_phc",
            name: "Surulere PHC",
            tier: "Tier 1 — PHC",
            location: "Surulere, Lagos",
          },
        },
      ]);
    }
  }
);


// ─── GET /api/referrals ───────────────────────────────────────────────────────
router.get("/", authenticate, async (req: Request, res: Response) => {
  const { status, facilityId, urgency } = req.query;
  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (urgency) {
    const u = (urgency as string).toUpperCase();
    if (u === "EMERGENCY" || u === "CRITICAL") where.urgencyTier = UrgencyTier.CRITICAL;
    else if (u === "URGENT" || u === "HIGH") where.urgencyTier = UrgencyTier.HIGH;
    else if (u === "ROUTINE" || u === "MEDIUM") where.urgencyTier = UrgencyTier.MEDIUM;
  }

  if (req.user!.role !== "ADMIN") {
    where.OR = [
      { sendingFacilityId: req.user!.facilityId },
      { receivingFacilityId: req.user!.facilityId },
    ];
  } else if (facilityId && isValidObjectId(facilityId as string)) {
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

  res.json(referrals.map(formatReferral));
});

// ─── GET /api/referrals/:id ───────────────────────────────────────────────────
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const isOid = isValidObjectId(req.params.id);
  const referral = await prisma.referral.findFirst({
    where: isOid ? { id: req.params.id } : { refCode: req.params.id },
    include: referralInclude,
  });

  if (!referral) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }

  res.json(formatReferral(referral));
});

// ─── POST /api/referrals/:id/match ────────────────────────────────────────────
router.post(
  "/:id/match",
  authenticate,
  async (req: Request, res: Response) => {
    const isOid = isValidObjectId(req.params.id);
    const referral = await prisma.referral.findFirst({
      where: isOid ? { id: req.params.id } : { refCode: req.params.id },
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
    const caps =
      referral.requiredCapabilities?.length > 0
        ? referral.requiredCapabilities
        : [referral.requiredCapability];

    const candidates = rankFacilities(
      allFacilities,
      caps,
      referral.sendingFacilityId,
      referral.sendingFacility.lat,
      referral.sendingFacility.lng,
      referral.urgencyTier,
      referral.rejectedFacilityIds
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

    res.json({
      candidates,
      selectedFacilityId: topMatch.facilityId,
      selectedFacilityName: topMatch.facilityName,
    });
  }
);

// ─── POST /api/referrals/:id/accept ───────────────────────────────────────────
router.post(
  "/:id/accept",
  authenticate,
  async (req: Request, res: Response) => {
    const isOid = isValidObjectId(req.params.id);
    const referral = await prisma.referral.findFirst({
      where: isOid ? { id: req.params.id } : { refCode: req.params.id },
    });

    if (!referral) {
      res.status(404).json({ error: "Referral not found" });
      return;
    }

    const updated = await transition(
      referral.id,
      ReferralStatus.ACCEPTED,
      EventType.ACCEPTED,
      req.user!.userId,
      { note: req.body?.note || "Referral accepted by receiving facility" }
    );

    const fullUpdated = await prisma.referral.findUnique({
      where: { id: referral.id },
      include: referralInclude,
    });

    res.json(formatReferral(fullUpdated));
  }
);

// ─── POST /api/referrals/:id/reject (Can't Accept) ────────────────────────────
// "For an incoming referral, the facility should be able to: Accept / Can't Accept.
// No reason field is needed for MVP."
const RejectSchema = z.object({
  reason: z.string().optional(),
});

const handleReject = async (req: Request, res: Response) => {
  const isOid = isValidObjectId(req.params.id);
  const referral = await prisma.referral.findFirst({
    where: isOid ? { id: req.params.id } : { refCode: req.params.id },
    include: { sendingFacility: true },
  });

  if (!referral) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }

  const reason = req.body?.reason?.trim() || "Unable to accept referral at this time";

  // Track which facility rejected
  const rejectedFacilityId = referral.receivingFacilityId;
  const rejectedFacilityIds = [...(referral.rejectedFacilityIds ?? [])];
  if (rejectedFacilityId && !rejectedFacilityIds.includes(rejectedFacilityId)) {
    rejectedFacilityIds.push(rejectedFacilityId);
  }

  await prisma.referral.update({
    where: { id: referral.id },
    data: { rejectionReason: reason, rejectedFacilityIds },
  });

  await transition(
    referral.id,
    ReferralStatus.REJECTED,
    EventType.REJECTED,
    req.user!.userId,
    { note: reason }
  );

  // Auto re-route to next available suitable facility
  const allFacilities = await prisma.facility.findMany();
  const caps =
    referral.requiredCapabilities?.length > 0
      ? referral.requiredCapabilities
      : [referral.requiredCapability];

  const candidates = rankFacilities(
    allFacilities,
    caps,
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
      referral: formatReferral(updated),
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
      referral: formatReferral(updated),
      rerouted: false,
      message: "No suitable facilities currently available for re-routing",
    });
  }
};

router.post("/:id/reject", authenticate, handleReject);
router.post("/:id/cant-accept", authenticate, handleReject);
router.post("/:id/decline", authenticate, handleReject);

// ─── POST /api/referrals/:id/status ───────────────────────────────────────────
// Supports lifecycle: Created → Facility Identified → Accepted → Transport Requested → In Transit → Arrived → Care Confirmed → Feedback Sent
const STATUS_TO_EVENT: Record<string, EventType> = {
  FACILITY_IDENTIFIED: EventType.MATCHED,
  MATCHED: EventType.MATCHED,
  ACCEPTED: EventType.ACCEPTED,
  TRANSPORT_REQUESTED: EventType.TRANSPORT_REQUESTED,
  IN_TRANSIT: EventType.IN_TRANSIT,
  ARRIVED: EventType.ARRIVED,
  CARE_CONFIRMED: EventType.CARE_CONFIRMED,
  FEEDBACK_SENT: EventType.FEEDBACK_SENT,
};

const STATUS_MAP: Record<string, ReferralStatus> = {
  FACILITY_IDENTIFIED: ReferralStatus.MATCHED,
  MATCHED: ReferralStatus.MATCHED,
  ACCEPTED: ReferralStatus.ACCEPTED,
  TRANSPORT_REQUESTED: ReferralStatus.TRANSPORT_REQUESTED,
  IN_TRANSIT: ReferralStatus.IN_TRANSIT,
  ARRIVED: ReferralStatus.ARRIVED,
  CARE_CONFIRMED: ReferralStatus.CARE_CONFIRMED,
  FEEDBACK_SENT: ReferralStatus.FEEDBACK_SENT,
};

router.post("/:id/status", authenticate, async (req: Request, res: Response) => {
  const isOid = isValidObjectId(req.params.id);
  const referral = await prisma.referral.findFirst({
    where: isOid ? { id: req.params.id } : { refCode: req.params.id },
  });

  if (!referral) {
    res.status(404).json({ error: "Referral not found" });
    return;
  }

  const rawStatus = (req.body?.status || "").toString().toUpperCase().replace(/[-\s]/g, "_");
  const targetStatus = STATUS_MAP[rawStatus];
  const eventType = STATUS_TO_EVENT[rawStatus];

  if (!targetStatus || !eventType) {
    res.status(400).json({
      error: `Invalid status "${req.body?.status}". Supported: Facility Identified, Accepted, Transport Requested, In Transit, Arrived, Care Confirmed, Feedback Sent`,
    });
    return;
  }

  const note = req.body?.note || `Referral status updated to ${targetStatus}`;
  const updated = await transition(
    referral.id,
    targetStatus,
    eventType,
    req.user!.userId,
    { note }
  );

  const fullUpdated = await prisma.referral.findUnique({
    where: { id: referral.id },
    include: referralInclude,
  });

  res.json(formatReferral(fullUpdated));
});

// ─── POST /api/referrals/:id/feedback ─────────────────────────────────────────
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
  async (req: Request, res: Response) => {
    const parsed = FeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const isOid = isValidObjectId(req.params.id);
    const referral = await prisma.referral.findFirst({
      where: isOid ? { id: req.params.id } : { refCode: req.params.id },
    });

    if (!referral) {
      res.status(404).json({ error: "Referral not found" });
      return;
    }

    const feedback = await prisma.feedbackNote.create({
      data: { referralId: referral.id, ...parsed.data },
    });

    await transition(
      referral.id,
      ReferralStatus.FEEDBACK_SENT,
      EventType.FEEDBACK_SENT,
      req.user!.userId,
      { note: "Clinical feedback loop completed" }
    );

    res.status(201).json(feedback);
  }
);

export default router;

