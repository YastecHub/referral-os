import { ReferralStatus, EventType } from "@prisma/client";
import prisma from "../config/prisma";
import { getIO } from "../config/socket";
import { ReferralUpdatePayload } from "../types";

// ─── Valid transitions ────────────────────────────────────────────────────────

const TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  CREATED:              [ReferralStatus.MATCHED, ReferralStatus.ACCEPTED],
  MATCHED:              [ReferralStatus.ACCEPTED, ReferralStatus.REJECTED],
  ACCEPTED:             [ReferralStatus.TRANSPORT_REQUESTED, ReferralStatus.IN_TRANSIT, ReferralStatus.ARRIVED],
  TRANSPORT_REQUESTED:  [ReferralStatus.IN_TRANSIT, ReferralStatus.ARRIVED],
  IN_TRANSIT:           [ReferralStatus.ARRIVED],
  ARRIVED:              [ReferralStatus.CARE_CONFIRMED],
  CARE_CONFIRMED:       [ReferralStatus.FEEDBACK_SENT],
  FEEDBACK_SENT:        [],
  REJECTED:             [ReferralStatus.MATCHED],
};

export function assertTransition(from: ReferralStatus, to: ReferralStatus) {
  if (!TRANSITIONS[from]?.includes(to)) {
    const err = new Error(
      `Invalid status transition: ${from} → ${to}`
    ) as Error & { status: number };
    err.status = 422;
    throw err;
  }
}

// ─── Transition + event log + broadcast ──────────────────────────────────────

export async function transition(
  referralId: string,
  toStatus: ReferralStatus,
  eventType: EventType,
  actorId: string | null,
  opts: { note?: string; metadata?: object } = {}
) {
  const referral = await prisma.referral.findUniqueOrThrow({
    where: { id: referralId },
  });

  assertTransition(referral.status, toStatus);

  const [updated] = await prisma.$transaction([
    prisma.referral.update({
      where: { id: referralId },
      data: { status: toStatus },
    }),
    prisma.referralEvent.create({
      data: {
        referralId,
        eventType,
        actorId,
        note: opts.note,
        metadata: opts.metadata ?? undefined,
      },
    }),
  ]);

  // Broadcast to all connected clients
  try {
    const io = getIO();
    const payload: ReferralUpdatePayload = {
      referralId,
      refCode: referral.refCode,
      status: toStatus,
      sendingFacilityId: referral.sendingFacilityId,
      receivingFacilityId: referral.receivingFacilityId,
      urgencyTier: referral.urgencyTier,
      timestamp: new Date().toISOString(),
    };
    // Emit to relevant facility rooms + admin room
    const rooms = new Set([`facility:${referral.sendingFacilityId}`, "admin"]);
    if (referral.receivingFacilityId) {
      rooms.add(`facility:${referral.receivingFacilityId}`);
    }
    for (const room of rooms) {
      io.to(room).emit("referral-updates", payload);
    }
  } catch {
    // Socket not critical — log and continue
    console.warn("[Socket] Broadcast skipped — IO not ready");
  }

  return updated;
}
