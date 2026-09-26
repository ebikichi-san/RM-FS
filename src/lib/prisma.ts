import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prismaRmfs?: PrismaClient };

export const prisma =
  globalForPrisma.prismaRmfs ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaRmfs = prisma;
}
