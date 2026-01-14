import { PrismaClient } from "@prisma/client";

// PrismaClient singleton to avoid multiple instances
// Each PrismaClient instance manages a connection pool (default ~10 connections)
// Creating multiple instances can exhaust database connections and slow performance

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
