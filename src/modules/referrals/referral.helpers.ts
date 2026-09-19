import prisma from "../../config/prisma";

export async function generateRefCode(): Promise<string> {
  const count = await prisma.referral.count();
  const year = new Date().getFullYear();
  return `REF-${year}-${String(count + 1).padStart(4, "0")}`;
}
