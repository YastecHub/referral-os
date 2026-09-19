import { Capability, AcceptingStatus, Facility } from "@prisma/client";
import { MatchCandidate } from "../types";

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreFacility(
  facility: Facility,
  requiredCapability: Capability,
  sendingLat: number,
  sendingLng: number,
  urgencyTier: string
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Capability match (40 pts)
  if (facility.capabilities.includes(requiredCapability)) {
    score += 40;
    reasons.push("has required capability");
  } else {
    return { score: 0, reason: "Missing required capability" };
  }

  // 2. Accepting status (25 pts)
  if (facility.acceptingStatus === AcceptingStatus.ACCEPTING) {
    score += 25;
    reasons.push("currently accepting");
  } else if (facility.acceptingStatus === AcceptingStatus.LIMITED) {
    score += 10;
    reasons.push("limited capacity");
  } else {
    return { score: 0, reason: "Facility unavailable" };
  }

  // 3. Distance (20 pts — closer is better, max benefit at ≤5 km)
  const dist = haversine(sendingLat, sendingLng, facility.lat, facility.lng);
  const distScore = Math.max(0, 20 - Math.floor(dist / 2));
  score += distScore;
  reasons.push(`${dist.toFixed(1)} km away`);

  // 4. Resource readiness (15 pts)
  if (facility.bedsAvailable > 0) score += 5;
  if (facility.specialistsOnDuty > 0) score += 5;
  if (
    requiredCapability === Capability.BLOOD_BANK ||
    requiredCapability === Capability.OBSTETRIC_EMERGENCY
  ) {
    if (facility.bloodStock > 0) score += 5;
  } else if (
    requiredCapability === Capability.THEATRE &&
    facility.theatreAvailable
  ) {
    score += 5;
  } else {
    score += 5;
  }

  // 5. Urgency boost — for CRITICAL, prefer tertiary
  if (urgencyTier === "CRITICAL" && facility.tier === "TERTIARY") score += 5;

  return { score: Math.min(score, 100), reason: reasons.join(", ") };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function rankFacilities(
  candidates: Facility[],
  requiredCapability: Capability,
  sendingFacilityId: string,
  sendingLat: number,
  sendingLng: number,
  urgencyTier: string,
  excludeFacilityIds: string[] = []
): MatchCandidate[] {
  return candidates
    .filter((f) => f.id !== sendingFacilityId)
    .filter((f) => !excludeFacilityIds.includes(f.id))
    .map((f) => {
      const { score, reason } = scoreFacility(
        f,
        requiredCapability,
        sendingLat,
        sendingLng,
        urgencyTier
      );
      return {
        facilityId: f.id,
        facilityName: f.name,
        score,
        reason,
        distance: parseFloat(
          haversine(sendingLat, sendingLng, f.lat, f.lng).toFixed(1)
        ),
      };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
