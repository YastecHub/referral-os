import { ReferralStatus, UrgencyTier, Capability } from "@prisma/client";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: string;
  facilityId: string;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface MatchCandidate {
  facilityId: string;
  facilityName: string;
  score: number;       // 0–100
  reason: string;
  distance: number;    // km
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface StructuredNotes {
  patientSummary: string;
  patientAge: number | null;
  patientGender: string | null;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  urgencyTier: UrgencyTier;
  urgencyReason: string;
  requiredCapability: Capability;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface ReferralUpdatePayload {
  referralId: string;
  refCode: string;
  status: ReferralStatus;
  sendingFacilityId: string;
  receivingFacilityId: string | null;
  urgencyTier: UrgencyTier;
  timestamp: string;
}

// ─── Express augmentation ─────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
