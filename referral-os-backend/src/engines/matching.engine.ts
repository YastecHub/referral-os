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

// ─── Capability Normalization ─────────────────────────────────────────────────

const CAPABILITY_MAP: Record<string, Capability> = {
  "emergency obstetric": Capability.OBSTETRIC_EMERGENCY,
  "obstetric emergency": Capability.OBSTETRIC_EMERGENCY,
  "obstetric specialist": Capability.OBSTETRIC_EMERGENCY,
  "blood transfusion": Capability.BLOOD_BANK,
  "blood bank": Capability.BLOOD_BANK,
  "theater": Capability.THEATRE,
  "theatre": Capability.THEATRE,
  "surgery": Capability.THEATRE,
  "maternal icu": Capability.ICU,
  "icu": Capability.ICU,
  "nicu": Capability.NICU,
  "picu": Capability.PAEDIATRICS,
  "pediatric emergency": Capability.PAEDIATRICS,
  "paediatrics": Capability.PAEDIATRICS,
  "pediatrics": Capability.PAEDIATRICS,
  "burns & trauma": Capability.TRAUMA,
  "trauma": Capability.TRAUMA,
  "dialysis": Capability.DIALYSIS,
};

export function normalizeCapability(cap: string | Capability): Capability {
  if (Object.values(Capability).includes(cap as Capability)) {
    return cap as Capability;
  }
  const key = String(cap).trim().toLowerCase();
  return CAPABILITY_MAP[key] ?? Capability.OBSTETRIC_EMERGENCY;
}

export function normalizeCapabilities(
  caps?: string | string[] | Capability | Capability[] | null
): Capability[] {
  if (!caps) return [Capability.OBSTETRIC_EMERGENCY];
  const list = Array.isArray(caps) ? caps : [caps];
  const normalized = list
    .filter(Boolean)
    .map((c) => normalizeCapability(c));
  return Array.from(new Set(normalized));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreFacility(
  facility: Facility,
  requiredCapabilities: Capability[],
  sendingLat: number,
  sendingLng: number,
  urgencyTier: string
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Capability match (up to 40 pts)
  const reqCaps = requiredCapabilities.length > 0 ? requiredCapabilities : [Capability.OBSTETRIC_EMERGENCY];
  const matchedCaps = reqCaps.filter((cap) => facility.capabilities.includes(cap));

  if (matchedCaps.length === 0) {
    return { score: 0, reason: "Missing required capability" };
  }

  const capScore = Math.round(40 * (matchedCaps.length / reqCaps.length));
  score += capScore;
  if (matchedCaps.length === reqCaps.length) {
    reasons.push("has all required capabilities");
  } else {
    reasons.push(`matches ${matchedCaps.length}/${reqCaps.length} capabilities`);
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
    reqCaps.includes(Capability.BLOOD_BANK) ||
    reqCaps.includes(Capability.OBSTETRIC_EMERGENCY)
  ) {
    if (facility.bloodStock > 0) score += 5;
  } else if (
    reqCaps.includes(Capability.THEATRE) &&
    facility.theatreAvailable
  ) {
    score += 5;
  } else {
    score += 5;
  }

  // 5. Urgency boost — for CRITICAL / Emergency, prefer tertiary/secondary
  const isEmergency =
    urgencyTier === "CRITICAL" ||
    urgencyTier === "HIGH" ||
    String(urgencyTier).toLowerCase() === "emergency";
  if (isEmergency && facility.tier === "TERTIARY") score += 5;

  return { score: Math.min(score, 100), reason: reasons.join(", ") };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function rankFacilities(
  candidates: Facility[],
  requiredCapabilities: Capability | Capability[] | string | string[],
  sendingFacilityId: string,
  sendingLat: number,
  sendingLng: number,
  urgencyTier: string,
  excludeFacilityIds: string[] = []
): MatchCandidate[] {
  const normCaps = normalizeCapabilities(requiredCapabilities);

  return candidates
    .filter((f) => f.id !== sendingFacilityId)
    .filter((f) => !excludeFacilityIds.includes(f.id))
    .map((f) => {
      const { score, reason } = scoreFacility(
        f,
        normCaps,
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
    .slice(0, 5);
}
