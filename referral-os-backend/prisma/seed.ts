import {
  PrismaClient,
  FacilityTier,
  AcceptingStatus,
  Capability,
  UserRole,
  ReferralStatus,
  UrgencyTier,
  EventType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Facilities ───────────────────────────────────────────────────────────────

const facilities = [
  {
    name: "Gbagada General Hospital",
    tier: FacilityTier.SECONDARY,
    address: "Hospital Rd, Gbagada, Lagos",
    lga: "Kosofe",
    lat: 6.5568,
    lng: 3.3869,
    phone: "01-234-5601",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.BLOOD_BANK,
      Capability.THEATRE,
      Capability.NICU,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 12,
    specialistsOnDuty: 3,
    bedsAvailable: 8,
    theatreAvailable: true,
  },
  {
    name: "Lagos Island General Hospital",
    tier: FacilityTier.TERTIARY,
    address: "1 Broad St, Lagos Island, Lagos",
    lga: "Lagos Island",
    lat: 6.4541,
    lng: 3.3947,
    phone: "01-234-5602",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.BLOOD_BANK,
      Capability.THEATRE,
      Capability.NICU,
      Capability.ICU,
      Capability.DIALYSIS,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 25,
    specialistsOnDuty: 6,
    bedsAvailable: 15,
    theatreAvailable: true,
  },
  {
    name: "Ikeja General Hospital",
    tier: FacilityTier.SECONDARY,
    address: "1 Obafemi Awolowo Way, Ikeja, Lagos",
    lga: "Ikeja",
    lat: 6.6018,
    lng: 3.3515,
    phone: "01-234-5603",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.BLOOD_BANK,
      Capability.THEATRE,
      Capability.PAEDIATRICS,
    ],
    acceptingStatus: AcceptingStatus.LIMITED,
    bloodStock: 4,
    specialistsOnDuty: 2,
    bedsAvailable: 3,
    theatreAvailable: false,
  },
  {
    name: "LASUTH — Lagos State University Teaching Hospital",
    tier: FacilityTier.TERTIARY,
    address: "1 Oba Akinjobi Way, Ikeja GRA, Lagos",
    lga: "Ikeja",
    lat: 6.5833,
    lng: 3.3500,
    phone: "01-234-5604",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.BLOOD_BANK,
      Capability.THEATRE,
      Capability.NICU,
      Capability.ICU,
      Capability.DIALYSIS,
      Capability.TRAUMA,
      Capability.PAEDIATRICS,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 40,
    specialistsOnDuty: 10,
    bedsAvailable: 22,
    theatreAvailable: true,
  },
  {
    name: "Alimosho General Hospital",
    tier: FacilityTier.SECONDARY,
    address: "Ile-Zik Ave, Alimosho, Lagos",
    lga: "Alimosho",
    lat: 6.6145,
    lng: 3.2571,
    phone: "01-234-5605",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.THEATRE,
      Capability.PAEDIATRICS,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 6,
    specialistsOnDuty: 2,
    bedsAvailable: 5,
    theatreAvailable: true,
  },
  {
    name: "Badagry General Hospital",
    tier: FacilityTier.SECONDARY,
    address: "Hospital Rd, Badagry, Lagos",
    lga: "Badagry",
    lat: 6.4167,
    lng: 2.8833,
    phone: "01-234-5606",
    capabilities: [Capability.OBSTETRIC_EMERGENCY, Capability.PAEDIATRICS],
    acceptingStatus: AcceptingStatus.UNAVAILABLE,
    bloodStock: 0,
    specialistsOnDuty: 0,
    bedsAvailable: 0,
    theatreAvailable: false,
  },
  {
    name: "Surulere PHC — Aguda",
    tier: FacilityTier.PHC,
    address: "12 Aguda St, Surulere, Lagos",
    lga: "Surulere",
    lat: 6.4969,
    lng: 3.3481,
    phone: "01-234-5607",
    capabilities: [Capability.OBSTETRIC_EMERGENCY],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 0,
    specialistsOnDuty: 1,
    bedsAvailable: 2,
    theatreAvailable: false,
  },
  {
    name: "Kosofe PHC — Alapere",
    tier: FacilityTier.PHC,
    address: "5 Alapere Rd, Kosofe, Lagos",
    lga: "Kosofe",
    lat: 6.5800,
    lng: 3.3900,
    phone: "01-234-5608",
    capabilities: [Capability.OBSTETRIC_EMERGENCY],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 0,
    specialistsOnDuty: 1,
    bedsAvailable: 1,
    theatreAvailable: false,
  },
  {
    name: "Epe General Hospital",
    tier: FacilityTier.SECONDARY,
    address: "Hospital Rd, Epe, Lagos",
    lga: "Epe",
    lat: 6.5833,
    lng: 3.9833,
    phone: "01-234-5609",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.BLOOD_BANK,
      Capability.THEATRE,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 8,
    specialistsOnDuty: 2,
    bedsAvailable: 6,
    theatreAvailable: true,
  },
  {
    name: "Mushin PHC",
    tier: FacilityTier.PHC,
    address: "22 Palm Ave, Mushin, Lagos",
    lga: "Mushin",
    lat: 6.5333,
    lng: 3.3500,
    phone: "01-234-5610",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.PAEDIATRICS,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 0,
    specialistsOnDuty: 1,
    bedsAvailable: 3,
    theatreAvailable: false,
  },
  {
    name: "Ebute metta CHC",
    tier: FacilityTier.PHC,
    address: "14 Cemetery St, Ebute Metta, Lagos",
    lga: "Lagos Mainland",
    lat: 6.4833,
    lng: 3.3833,
    phone: "01-234-5611",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.BLOOD_BANK,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 2,
    specialistsOnDuty: 2,
    bedsAvailable: 4,
    theatreAvailable: false,
  },
  {
    name: "Lagos General",
    tier: FacilityTier.SECONDARY,
    address: "1 Broad St, Marina, Lagos Island, Lagos",
    lga: "Lagos Island",
    lat: 6.4541,
    lng: 3.3947,
    phone: "01-234-5602",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.BLOOD_BANK,
      Capability.THEATRE,
      Capability.NICU,
      Capability.ICU,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 20,
    specialistsOnDuty: 5,
    bedsAvailable: 12,
    theatreAvailable: true,
  },
  {
    name: "Surulere PHC",
    tier: FacilityTier.PHC,
    address: "12 Aguda St, Surulere, Lagos",
    lga: "Surulere",
    lat: 6.4969,
    lng: 3.3481,
    phone: "01-234-5607",
    capabilities: [
      Capability.OBSTETRIC_EMERGENCY,
      Capability.PAEDIATRICS,
    ],
    acceptingStatus: AcceptingStatus.ACCEPTING,
    bloodStock: 0,
    specialistsOnDuty: 1,
    bedsAvailable: 2,
    theatreAvailable: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function refCode(n: number) {
  return `REF-2026-${String(n).padStart(4, "0")}`;
}

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding ReferralOS...");

  // 1. Facilities
  const createdFacilities = await Promise.all(
    facilities.map((f) => prisma.facility.create({ data: f }))
  );

  const byName = (name: string) => {
    const f = createdFacilities.find((x) => x.name === name);
    if (!f) throw new Error(`Facility not found: ${name}`);
    return f;
  };

  const surulere = byName("Surulere PHC — Aguda");
  const kosofe = byName("Kosofe PHC — Alapere");
  const gbagada = byName("Gbagada General Hospital");
  const lasuth = byName("LASUTH — Lagos State University Teaching Hospital");
  const lagosIsland = byName("Lagos Island General Hospital");
  const ikeja = byName("Ikeja General Hospital");
  const alimosho = byName("Alimosho General Hospital");

  console.log(`✅  ${createdFacilities.length} facilities created`);

  // 2. Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Amaka Obi",
        email: "amaka@surulere-phc.ng",
        password: await hashPassword("demo1234"),
        role: UserRole.PHC_WORKER,
        facilityId: surulere.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Chidi Nwosu",
        email: "chidi@kosofe-phc.ng",
        password: await hashPassword("demo1234"),
        role: UserRole.PHC_WORKER,
        facilityId: kosofe.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Fatima Bello",
        email: "fatima@gbagada.ng",
        password: await hashPassword("demo1234"),
        role: UserRole.HOSPITAL_STAFF,
        facilityId: gbagada.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Emeka Eze",
        email: "emeka@lasuth.ng",
        password: await hashPassword("demo1234"),
        role: UserRole.HOSPITAL_STAFF,
        facilityId: lasuth.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Admin Nexoria",
        email: "admin@referralos.ng",
        password: await hashPassword("demo1234"),
        role: UserRole.ADMIN,
        facilityId: lasuth.id,
      },
    }),
  ]);

  const [amaka, chidi, fatima, emeka, admin] = users;
  console.log(`✅  ${users.length} users created`);

  // 3. Six referral scenarios
  // ── Scenario 1: Full happy path (FEEDBACK_SENT) ───────────────────────────
  const ref1 = await prisma.referral.create({
    data: {
      refCode: refCode(1),
      rawNotes:
        "28yr old woman, 36wks pregnant, heavy bleeding since 2hrs, BP 80/50, very weak, needs urgent surgery",
      patientSummary:
        "28-year-old female, 36 weeks gestation. Presenting with antepartum haemorrhage x2 hours. BP 80/50 mmHg, GCS 14. Suspected placenta praevia. Requires emergency obstetric intervention.",
      patientAge: 28,
      patientGender: "Female",
      chiefComplaint: "Antepartum haemorrhage",
      clinicalFindings: "BP 80/50, HR 120, pallor, active vaginal bleeding",
      urgencyTier: UrgencyTier.CRITICAL,
      urgencyReason: "Haemodynamic instability with active obstetric bleeding",
      requiredCapability: Capability.OBSTETRIC_EMERGENCY,
      status: ReferralStatus.FEEDBACK_SENT,
      sendingFacilityId: surulere.id,
      receivingFacilityId: gbagada.id,
    },
  });

  await prisma.referralEvent.createMany({
    data: [
      { referralId: ref1.id, eventType: EventType.CREATED, actorId: amaka.id, timestamp: new Date(Date.now() - 5 * 3600000) },
      { referralId: ref1.id, eventType: EventType.MATCHED, actorId: amaka.id, timestamp: new Date(Date.now() - 4.9 * 3600000) },
      { referralId: ref1.id, eventType: EventType.ACCEPTED, actorId: fatima.id, timestamp: new Date(Date.now() - 4.7 * 3600000) },
      { referralId: ref1.id, eventType: EventType.IN_TRANSIT, actorId: amaka.id, timestamp: new Date(Date.now() - 4.5 * 3600000) },
      { referralId: ref1.id, eventType: EventType.ARRIVED, actorId: fatima.id, timestamp: new Date(Date.now() - 4.2 * 3600000) },
      { referralId: ref1.id, eventType: EventType.CARE_CONFIRMED, actorId: fatima.id, timestamp: new Date(Date.now() - 4.0 * 3600000) },
      { referralId: ref1.id, eventType: EventType.FEEDBACK_SENT, actorId: fatima.id, timestamp: new Date(Date.now() - 3.8 * 3600000) },
    ],
  });

  await prisma.feedbackNote.create({
    data: {
      referralId: ref1.id,
      diagnosisConfirmed: "Placenta praevia with haemorrhage",
      treatmentGiven: "Emergency caesarean section, 4 units blood transfused",
      followUpRequired: true,
      followUpNote: "Postnatal review in 6 weeks",
      outcomeStatus: "Stable",
    },
  });

  // ── Scenario 2: Rejected → Rematched → Accepted → In Transit ─────────────
  const ref2 = await prisma.referral.create({
    data: {
      refCode: refCode(2),
      rawNotes:
        "32yr old, 38wks, prolonged labour 18hrs, foetal distress, needs c-section",
      patientSummary:
        "32-year-old female, 38 weeks gestation. Prolonged labour 18 hours with foetal distress (late decelerations). Requires emergency caesarean section.",
      patientAge: 32,
      patientGender: "Female",
      chiefComplaint: "Prolonged labour with foetal distress",
      clinicalFindings: "CTG: late decelerations, cervix 7cm, 18hrs labour",
      urgencyTier: UrgencyTier.HIGH,
      urgencyReason: "Foetal distress with prolonged labour",
      requiredCapability: Capability.THEATRE,
      status: ReferralStatus.IN_TRANSIT,
      sendingFacilityId: kosofe.id,
      receivingFacilityId: lasuth.id,
      rejectionReason: "Theatre unavailable",
      rematchCount: 1,
    },
  });

  await prisma.referralEvent.createMany({
    data: [
      { referralId: ref2.id, eventType: EventType.CREATED, actorId: chidi.id, timestamp: new Date(Date.now() - 3 * 3600000) },
      { referralId: ref2.id, eventType: EventType.MATCHED, actorId: chidi.id, timestamp: new Date(Date.now() - 2.9 * 3600000) },
      { referralId: ref2.id, eventType: EventType.REJECTED, actorId: emeka.id, note: "Theatre unavailable", timestamp: new Date(Date.now() - 2.7 * 3600000) },
      { referralId: ref2.id, eventType: EventType.REMATCHED, actorId: null, note: "Auto-rematched to LASUTH", timestamp: new Date(Date.now() - 2.6 * 3600000) },
      { referralId: ref2.id, eventType: EventType.ACCEPTED, actorId: emeka.id, timestamp: new Date(Date.now() - 2.4 * 3600000) },
      { referralId: ref2.id, eventType: EventType.IN_TRANSIT, actorId: chidi.id, timestamp: new Date(Date.now() - 2.0 * 3600000) },
    ],
  });

  // ── Scenario 3: Accepted, patient arrived ─────────────────────────────────
  const ref3 = await prisma.referral.create({
    data: {
      refCode: refCode(3),
      rawNotes:
        "25yr old, eclampsia, seizures x3, BP 180/120, 34wks, needs ICU and magnesium",
      patientSummary:
        "25-year-old female, 34 weeks gestation. Eclampsia with 3 seizure episodes. BP 180/120 mmHg. Requires ICU admission and magnesium sulphate protocol.",
      patientAge: 25,
      patientGender: "Female",
      chiefComplaint: "Eclampsia with recurrent seizures",
      clinicalFindings: "BP 180/120, 3 tonic-clonic seizures, proteinuria 3+",
      urgencyTier: UrgencyTier.CRITICAL,
      urgencyReason: "Active eclampsia with haemodynamic instability",
      requiredCapability: Capability.ICU,
      status: ReferralStatus.ARRIVED,
      sendingFacilityId: surulere.id,
      receivingFacilityId: lagosIsland.id,
    },
  });

  await prisma.referralEvent.createMany({
    data: [
      { referralId: ref3.id, eventType: EventType.CREATED, actorId: amaka.id, timestamp: new Date(Date.now() - 2 * 3600000) },
      { referralId: ref3.id, eventType: EventType.MATCHED, actorId: amaka.id, timestamp: new Date(Date.now() - 1.9 * 3600000) },
      { referralId: ref3.id, eventType: EventType.ACCEPTED, actorId: null, timestamp: new Date(Date.now() - 1.7 * 3600000) },
      { referralId: ref3.id, eventType: EventType.IN_TRANSIT, actorId: amaka.id, timestamp: new Date(Date.now() - 1.5 * 3600000) },
      { referralId: ref3.id, eventType: EventType.ARRIVED, actorId: null, timestamp: new Date(Date.now() - 1.2 * 3600000) },
    ],
  });

  // ── Scenario 4: Matched, awaiting acceptance ──────────────────────────────
  const ref4 = await prisma.referral.create({
    data: {
      refCode: refCode(4),
      rawNotes:
        "19yr old, first pregnancy, 40wks, obstructed labour, baby not coming out, needs surgery fast",
      patientSummary:
        "19-year-old primigravida, 40 weeks gestation. Obstructed labour, failure to progress. Requires emergency operative delivery.",
      patientAge: 19,
      patientGender: "Female",
      chiefComplaint: "Obstructed labour",
      clinicalFindings: "Fully dilated, 2hrs pushing, caput ++, moulding ++",
      urgencyTier: UrgencyTier.HIGH,
      urgencyReason: "Obstructed labour with risk of uterine rupture",
      requiredCapability: Capability.OBSTETRIC_EMERGENCY,
      status: ReferralStatus.MATCHED,
      sendingFacilityId: kosofe.id,
      receivingFacilityId: ikeja.id,
    },
  });

  await prisma.referralEvent.createMany({
    data: [
      { referralId: ref4.id, eventType: EventType.CREATED, actorId: chidi.id, timestamp: new Date(Date.now() - 0.5 * 3600000) },
      { referralId: ref4.id, eventType: EventType.MATCHED, actorId: chidi.id, timestamp: new Date(Date.now() - 0.4 * 3600000) },
    ],
  });

  // ── Scenario 5: Just created, not yet matched ─────────────────────────────
  const ref5 = await prisma.referral.create({
    data: {
      refCode: refCode(5),
      rawNotes:
        "35yr old, 30wks twins, preterm labour, contractions every 3mins, needs NICU",
      patientSummary:
        "35-year-old female, 30 weeks gestation with twin pregnancy. Preterm labour, contractions every 3 minutes. Requires NICU-capable facility for anticipated preterm delivery.",
      patientAge: 35,
      patientGender: "Female",
      chiefComplaint: "Preterm labour — twin pregnancy",
      clinicalFindings: "Contractions q3min, cervix 4cm, twins confirmed on USS",
      urgencyTier: UrgencyTier.HIGH,
      urgencyReason: "Preterm twin delivery requiring NICU support",
      requiredCapability: Capability.NICU,
      status: ReferralStatus.CREATED,
      sendingFacilityId: surulere.id,
    },
  });

  await prisma.referralEvent.create({
    data: {
      referralId: ref5.id,
      eventType: EventType.CREATED,
      actorId: amaka.id,
      timestamp: new Date(Date.now() - 0.1 * 3600000),
    },
  });

  // ── Scenario 6: Care confirmed, feedback pending ──────────────────────────
  const ref6 = await prisma.referral.create({
    data: {
      refCode: refCode(6),
      rawNotes:
        "42yr old, postpartum haemorrhage, delivered 1hr ago at PHC, bleeding not stopping, BP dropping",
      patientSummary:
        "42-year-old female. Postpartum haemorrhage 1 hour post-delivery at PHC. Estimated blood loss >1L. BP 90/60 and falling. Requires blood transfusion and surgical review.",
      patientAge: 42,
      patientGender: "Female",
      chiefComplaint: "Postpartum haemorrhage",
      clinicalFindings: "EBL >1L, BP 90/60, HR 130, uterus atonic",
      urgencyTier: UrgencyTier.CRITICAL,
      urgencyReason: "Postpartum haemorrhage with haemodynamic compromise",
      requiredCapability: Capability.BLOOD_BANK,
      status: ReferralStatus.CARE_CONFIRMED,
      sendingFacilityId: kosofe.id,
      receivingFacilityId: alimosho.id,
    },
  });

  await prisma.referralEvent.createMany({
    data: [
      { referralId: ref6.id, eventType: EventType.CREATED, actorId: chidi.id, timestamp: new Date(Date.now() - 1.5 * 3600000) },
      { referralId: ref6.id, eventType: EventType.MATCHED, actorId: chidi.id, timestamp: new Date(Date.now() - 1.4 * 3600000) },
      { referralId: ref6.id, eventType: EventType.ACCEPTED, actorId: null, timestamp: new Date(Date.now() - 1.3 * 3600000) },
      { referralId: ref6.id, eventType: EventType.IN_TRANSIT, actorId: chidi.id, timestamp: new Date(Date.now() - 1.1 * 3600000) },
      { referralId: ref6.id, eventType: EventType.ARRIVED, actorId: null, timestamp: new Date(Date.now() - 0.9 * 3600000) },
      { referralId: ref6.id, eventType: EventType.CARE_CONFIRMED, actorId: null, timestamp: new Date(Date.now() - 0.7 * 3600000) },
    ],
  });

  console.log("✅  6 referral scenarios created");
  console.log("\n🎉  Seed complete. Demo credentials:");
  console.log("   PHC Worker  : amaka@surulere-phc.ng  / demo1234");
  console.log("   PHC Worker  : chidi@kosofe-phc.ng    / demo1234");
  console.log("   Hospital    : fatima@gbagada.ng       / demo1234");
  console.log("   Hospital    : emeka@lasuth.ng         / demo1234");
  console.log("   Admin       : admin@referralos.ng     / demo1234");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
