import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function testDb(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Test basic database connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Test a simple query - count users
    const userCount = await prisma.user.count();
    console.log(`✅ User count query successful: ${userCount} users`);

    // Test fetching a user (without password for security)
    const users = await prisma.user.findMany({
      take: 1,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Get database URL (masked for security)
    const dbUrl = process.env.DATABASE_URL;
    const maskedDbUrl = dbUrl
      ? dbUrl.substring(0, 20) + "..." + dbUrl.substring(dbUrl.length - 20)
      : "Not set";

    return res.status(200).json({
      success: true,
      message: "Database connection successful",
      details: {
        connected: true,
        userCount,
        sampleUser: users[0] || null,
        databaseUrl: maskedDbUrl,
        jwtSecretSet: !!process.env.JWT_SECRET,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Database connection error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Database connection failed",
      details: {
        message: error instanceof Error ? error.message : "Unknown error",
        databaseUrlSet: !!process.env.DATABASE_URL,
        jwtSecretSet: !!process.env.JWT_SECRET,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
