import prisma from "../src/config/prisma";
import { FacilityTier, AcceptingStatus, Capability } from "@prisma/client";

async function sync() {
  console.log("Checking and syncing frontend facilities...");
  const facilitiesToAdd = [
    {
      name: "Mushin PHC",
      tier: FacilityTier.PHC,
      address: "22 Palm Ave, Mushin, Lagos",
      lga: "Mushin",
      lat: 6.5333,
      lng: 3.3500,
      phone: "01-234-5610",
      capabilities: [Capability.OBSTETRIC_EMERGENCY, Capability.PAEDIATRICS],
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
      capabilities: [Capability.OBSTETRIC_EMERGENCY, Capability.BLOOD_BANK],
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
      capabilities: [Capability.OBSTETRIC_EMERGENCY, Capability.PAEDIATRICS],
      acceptingStatus: AcceptingStatus.ACCEPTING,
      bloodStock: 0,
      specialistsOnDuty: 1,
      bedsAvailable: 2,
      theatreAvailable: false,
    },
  ];

  for (const fac of facilitiesToAdd) {
    const existing = await prisma.facility.findFirst({
      where: {
        OR: [
          { name: fac.name },
          { name: { contains: fac.name, mode: "insensitive" } },
        ],
      },
    });
    if (!existing) {
      const created = await prisma.facility.create({ data: fac });
      console.log(`✅ Created facility: ${created.name} (${created.id})`);
    } else {
      console.log(`ℹ️ Facility already exists: ${existing.name} (${existing.id})`);
    }
  }

  const all = await prisma.facility.findMany({ select: { id: true, name: true, tier: true } });
  console.log(`\nTotal facilities in database: ${all.length}`);
  all.forEach((f) => console.log(` - [${f.tier}] ${f.name} (${f.id})`));
}

sync()
  .catch((e) => {
    console.error("Sync error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
