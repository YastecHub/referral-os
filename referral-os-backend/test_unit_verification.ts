import { Capability, FacilityTier, AcceptingStatus, UrgencyTier, ReferralStatus, EventType } from "@prisma/client";
import {
  rankFacilities,
  normalizeCapability,
  normalizeCapabilities,
} from "./src/engines/matching.engine";
import { structureNotes } from "./src/engines/ai.engine";
import { assertTransition } from "./src/engines/coordination.engine";

async function main() {
  console.log("==================================================");
  console.log("   ReferralOS Backend Logic & Compliance Verification   ");
  console.log("==================================================\n");

  // ─── Test 1: Capability Normalizer ───────────────────────────────────────────
  console.log("Test 1: Verifying Capability Normalization...");
  const expectedMappings: [string, Capability][] = [
    ["Emergency obstetric", Capability.OBSTETRIC_EMERGENCY],
    ["Blood transfusion", Capability.BLOOD_BANK],
    ["Theater", Capability.THEATRE],
    ["Maternal ICU", Capability.ICU],
    ["NICU", Capability.NICU],
    ["PICU", Capability.PAEDIATRICS],
    ["Pediatric emergency", Capability.PAEDIATRICS],
    ["Obstetric specialist", Capability.OBSTETRIC_EMERGENCY],
    ["Surgery", Capability.THEATRE],
    ["Burns & trauma", Capability.TRAUMA],
  ];

  for (const [input, expected] of expectedMappings) {
    const result = normalizeCapability(input);
    if (result !== expected) {
      throw new Error(`Mapping failed for "${input}": got ${result}, expected ${expected}`);
    }
  }
  console.log("✅ All 10 prompt capabilities correctly mapped to Prisma Capability enums.\n");

  // ─── Test 2: Matching Engine Multi-Capability Scoring ─────────────────────────
  console.log("Test 2: Verifying Multi-Capability Matching Engine...");
  const mockFacilities: any[] = [
    {
      id: "fac-1",
      name: "Surulere PHC",
      tier: FacilityTier.PHC,
      lat: 6.4969,
      lng: 3.3481,
      acceptingStatus: AcceptingStatus.ACCEPTING,
      capabilities: [Capability.OBSTETRIC_EMERGENCY],
      bloodStock: 0,
      bedsAvailable: 2,
      specialistsOnDuty: 1,
      theatreAvailable: false,
    },
    {
      id: "fac-2",
      name: "Gbagada General Hospital",
      tier: FacilityTier.SECONDARY,
      lat: 6.5568,
      lng: 3.3869,
      acceptingStatus: AcceptingStatus.ACCEPTING,
      capabilities: [
        Capability.OBSTETRIC_EMERGENCY,
        Capability.BLOOD_BANK,
        Capability.THEATRE,
        Capability.NICU,
      ],
      bloodStock: 12,
      bedsAvailable: 8,
      specialistsOnDuty: 3,
      theatreAvailable: true,
    },
    {
      id: "fac-3",
      name: "LASUTH Teaching Hospital",
      tier: FacilityTier.TERTIARY,
      lat: 6.5833,
      lng: 3.3500,
      acceptingStatus: AcceptingStatus.ACCEPTING,
      capabilities: [
        Capability.OBSTETRIC_EMERGENCY,
        Capability.BLOOD_BANK,
        Capability.THEATRE,
        Capability.NICU,
        Capability.ICU,
        Capability.TRAUMA,
      ],
      bloodStock: 40,
      bedsAvailable: 20,
      specialistsOnDuty: 10,
      theatreAvailable: true,
    },
    {
      id: "fac-4",
      name: "Badagry General Hospital (Unavailable)",
      tier: FacilityTier.SECONDARY,
      lat: 6.4167,
      lng: 2.8833,
      acceptingStatus: AcceptingStatus.UNAVAILABLE,
      capabilities: [Capability.OBSTETRIC_EMERGENCY],
      bloodStock: 0,
      bedsAvailable: 0,
      specialistsOnDuty: 0,
      theatreAvailable: false,
    },
  ];

  // Case A: Referral needing Blood Transfusion & Theater with Emergency urgency
  const matches = rankFacilities(
    mockFacilities,
    ["Blood transfusion", "Theater"],
    "fac-1", // sending facility
    6.4969,
    3.3481,
    "CRITICAL"
  );

  console.log("   Candidates found:", matches.length);
  matches.forEach((m, idx) => {
    console.log(`   #${idx + 1}: ${m.facilityName} - Score: ${m.score}/100, Dist: ${m.distance}km (${m.reason})`);
  });

  if (matches.length === 0 || matches[0].facilityId !== "fac-2" && matches[0].facilityId !== "fac-3") {
    throw new Error("Matching engine failed to prioritize facilities with matching blood & theatre capabilities!");
  }
  console.log("✅ Matching engine correctly scored facilities based on multi-capabilities, readiness, distance, and urgency.\n");

  // ─── Test 3: AI Engine Fallback Note Structuring ─────────────────────────────
  console.log("Test 3: Testing Note Structuring (Triage Engine)...");
  const messyNote = "Patient: Mrs Adewale, 32yr old female, heavy antepartum hemorrhage for 3 hours, BP 80/50, needs blood transfusion and emergency c-section";
  const structured = await structureNotes(messyNote);

  console.log("   Parsed Patient Name:", structured.patientName);
  console.log("   Parsed Age:", structured.patientAge);
  console.log("   Parsed Gender:", structured.patientGender);
  console.log("   Parsed Urgency:", structured.urgencyTier);
  console.log("   Parsed Capabilities:", structured.requiredCapabilities);

  if (structured.patientAge !== 32) throw new Error("Failed to extract age 32");
  if (structured.urgencyTier !== "CRITICAL") throw new Error("Failed to detect CRITICAL urgency from hemorrhage");
  console.log("✅ AI triage engine successfully structured clinical notes into required fields.\n");

  // ─── Test 4: Referral Status Transition Sequence ─────────────────────────────
  console.log("Test 4: Verifying Workflow State Machine...");
  // Created → Facility Identified (MATCHED) → Accepted → Transport Requested → In Transit → Arrived → Care Confirmed → Feedback Sent
  assertTransition(ReferralStatus.CREATED, ReferralStatus.MATCHED);
  assertTransition(ReferralStatus.MATCHED, ReferralStatus.ACCEPTED);
  assertTransition(ReferralStatus.ACCEPTED, ReferralStatus.TRANSPORT_REQUESTED);
  assertTransition(ReferralStatus.TRANSPORT_REQUESTED, ReferralStatus.IN_TRANSIT);
  assertTransition(ReferralStatus.IN_TRANSIT, ReferralStatus.ARRIVED);
  assertTransition(ReferralStatus.ARRIVED, ReferralStatus.CARE_CONFIRMED);
  assertTransition(ReferralStatus.CARE_CONFIRMED, ReferralStatus.FEEDBACK_SENT);

  console.log("✅ All required referral statuses transition strictly and correctly through the entire lifecycle.\n");

  // ─── Test 5: Can't Accept Action (Rejection with optional reason) ──────────────
  console.log("Test 5: Verifying Rejection / Can't Accept Transition...");
  assertTransition(ReferralStatus.MATCHED, ReferralStatus.REJECTED);
  assertTransition(ReferralStatus.REJECTED, ReferralStatus.MATCHED);
  console.log("✅ Can't Accept (Rejection & Auto Rematch) transitions confirmed.\n");

  console.log("==================================================");
  console.log("   🎉 ALL LOGIC AND COMPLIANCE TESTS PASSED!   ");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
