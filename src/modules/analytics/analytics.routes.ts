import { Router, Request, Response } from "express";
import { ReferralStatus, EventType } from "@prisma/client";
import prisma from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { generateAnalyticsInsight } from "../../engines/ai.engine";

const router = Router();

// GET /api/analytics/summary
router.get("/summary", authenticate, async (_req: Request, res: Response) => {
  const [referrals, events] = await Promise.all([
    prisma.referral.findMany({
      select: {
        id: true,
        status: true,
        urgencyTier: true,
        rejectionReason: true,
        createdAt: true,
      },
    }),
    prisma.referralEvent.findMany({
      where: {
        eventType: { in: [EventType.CREATED, EventType.ACCEPTED] },
      },
      select: { referralId: true, eventType: true, timestamp: true },
    }),
  ]);

  const total = referrals.length;
  const completed = referrals.filter(
    (r) => r.status === ReferralStatus.FEEDBACK_SENT
  ).length;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  const criticalCount = referrals.filter(
    (r) => r.urgencyTier === "CRITICAL"
  ).length;

  // Average time from CREATED to ACCEPTED (in minutes)
  const createdMap = new Map<string, Date>();
  const acceptedMap = new Map<string, Date>();
  for (const e of events) {
    if (e.eventType === EventType.CREATED) createdMap.set(e.referralId, e.timestamp);
    if (e.eventType === EventType.ACCEPTED) acceptedMap.set(e.referralId, e.timestamp);
  }

  const acceptanceTimes: number[] = [];
  for (const [id, createdAt] of createdMap) {
    const acceptedAt = acceptedMap.get(id);
    if (acceptedAt) {
      acceptanceTimes.push((acceptedAt.getTime() - createdAt.getTime()) / 60000);
    }
  }
  const avgAcceptanceMinutes =
    acceptanceTimes.length > 0
      ? acceptanceTimes.reduce((a, b) => a + b, 0) / acceptanceTimes.length
      : 0;

  // Top rejection reason
  const rejectionCounts: Record<string, number> = {};
  for (const r of referrals) {
    if (r.rejectionReason) {
      rejectionCounts[r.rejectionReason] =
        (rejectionCounts[r.rejectionReason] ?? 0) + 1;
    }
  }
  const topRejectionReason =
    Object.entries(rejectionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Status breakdown
  const byStatus: Record<string, number> = {};
  for (const r of referrals) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  }

  const stats = { totalReferrals: total, completionRate, avgAcceptanceMinutes, topRejectionReason, criticalCount };
  const insight = await generateAnalyticsInsight(stats);

  res.json({
    totalReferrals: total,
    completionRate: parseFloat(completionRate.toFixed(1)),
    avgAcceptanceMinutes: parseFloat(avgAcceptanceMinutes.toFixed(1)),
    criticalCount,
    topRejectionReason,
    byStatus,
    insight,
  });
});

// ─── GET /api/analytics/active ───────────────────────────────────────────────
router.get("/active", authenticate, async (_req: Request, res: Response) => {
  const referrals = await prisma.referral.findMany({
    where: {
      status: {
        notIn: [ReferralStatus.FEEDBACK_SENT, ReferralStatus.REJECTED],
      },
    },
    include: {
      sendingFacility: {
        select: { id: true, name: true, lga: true, lat: true, lng: true },
      },
      receivingFacility: {
        select: { id: true, name: true, lga: true, lat: true, lng: true },
      },
      events: { orderBy: { timestamp: "asc" as const } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(referrals);
});

// ─── GET /api/analytics/facilities ───────────────────────────────────────────
router.get(
  "/facilities",
  authenticate,
  async (_req: Request, res: Response) => {
    const facilities = await prisma.facility.findMany({
      include: {
        sentReferrals: { select: { id: true } },
        receivedReferrals: { select: { id: true, status: true } },
      },
    });

    const result = facilities.map((f) => ({
      id: f.id,
      name: f.name,
      tier: f.tier,
      lga: f.lga,
      lat: f.lat,
      lng: f.lng,
      acceptingStatus: f.acceptingStatus,
      capabilities: f.capabilities,
      bloodStock: f.bloodStock,
      specialistsOnDuty: f.specialistsOnDuty,
      bedsAvailable: f.bedsAvailable,
      theatreAvailable: f.theatreAvailable,
      totalSent: f.sentReferrals.length,
      totalReceived: f.receivedReferrals.length,
      activeIncoming: f.receivedReferrals.filter(
        (r) =>
          !([ReferralStatus.FEEDBACK_SENT, ReferralStatus.REJECTED] as ReferralStatus[]).includes(
            r.status
          )
      ).length,
    }));

    res.json(result);
  }
);

// ─── GET /api/analytics/timeline ─────────────────────────────────────────────
router.get("/timeline", authenticate, async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const referrals = await prisma.referral.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, urgencyTier: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const byDay: Record<
    string,
    { total: number; critical: number; completed: number }
  > = {};
  for (const r of referrals) {
    const day = r.createdAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { total: 0, critical: 0, completed: 0 };
    byDay[day].total++;
    if (r.urgencyTier === "CRITICAL") byDay[day].critical++;
    if (r.status === ReferralStatus.FEEDBACK_SENT) byDay[day].completed++;
  }

  res.json({
    period: `${days} days`,
    data: Object.entries(byDay).map(([date, counts]) => ({ date, ...counts })),
  });
});

export default router;
