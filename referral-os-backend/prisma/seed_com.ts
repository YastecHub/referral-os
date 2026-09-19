import prisma from "../src/config/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

async function seedCom() {
  console.log("🌱 Adding .com and ensuring .ng demo accounts in MongoDB...");
  const facilities = await prisma.facility.findMany();
  const surulere = facilities.find((f) => f.name.includes("Surulere"));
  const kosofe = facilities.find((f) => f.name.includes("Kosofe"));
  const gbagada = facilities.find((f) => f.name.includes("Gbagada"));
  const lasuth = facilities.find((f) => f.name.includes("LASUTH"));

  if (!surulere || !kosofe || !gbagada || !lasuth) {
    throw new Error("Required facilities not found in database.");
  }

  const hash = await bcrypt.hash("demo1234", 10);

  const users = [
    // .com accounts
    { name: "Amaka Obi", email: "amaka@surulere-phc.com", role: UserRole.PHC_WORKER, facilityId: surulere.id },
    { name: "Chidi Nwosu", email: "chidi@kosofe-phc.com", role: UserRole.PHC_WORKER, facilityId: kosofe.id },
    { name: "Dr. Fatima Bello", email: "fatima@gbagada.com", role: UserRole.HOSPITAL_STAFF, facilityId: gbagada.id },
    { name: "Dr. Emeka Eze", email: "emeka@lasuth.com", role: UserRole.HOSPITAL_STAFF, facilityId: lasuth.id },
    { name: "Admin Nexoria", email: "admin@referralos.com", role: UserRole.ADMIN, facilityId: lasuth.id },
    { name: "Dr. Ngozi Adeyemi", email: "ngozi@gbagada.com", role: UserRole.PHC_WORKER, facilityId: gbagada.id },

    // .ng accounts (backup)
    { name: "Amaka Obi", email: "amaka@surulere-phc.ng", role: UserRole.PHC_WORKER, facilityId: surulere.id },
    { name: "Chidi Nwosu", email: "chidi@kosofe-phc.ng", role: UserRole.PHC_WORKER, facilityId: kosofe.id },
    { name: "Dr. Fatima Bello", email: "fatima@gbagada.ng", role: UserRole.HOSPITAL_STAFF, facilityId: gbagada.id },
    { name: "Dr. Emeka Eze", email: "emeka@lasuth.ng", role: UserRole.HOSPITAL_STAFF, facilityId: lasuth.id },
    { name: "Admin Nexoria", email: "admin@referralos.ng", role: UserRole.ADMIN, facilityId: lasuth.id },
    { name: "Dr. Ngozi Adeyemi", email: "ngozi@gbagada.ng", role: UserRole.PHC_WORKER, facilityId: gbagada.id },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          password: hash,
          role: u.role,
          facilityId: u.facilityId,
        },
      });
      console.log(`✅ Created: ${u.email} (${u.role})`);
    } else {
      console.log(`ℹ️ Already exists: ${u.email}`);
    }
  }

  console.log("\n🎉 Done! All .com and .ng accounts are active with password: demo1234");
}

seedCom()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
