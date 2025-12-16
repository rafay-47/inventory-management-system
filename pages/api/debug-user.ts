import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function debugUser(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true, // We'll check if password field exists
        createdAt: true,
      }
    });

    // Get total user count
    const totalUsers = await prisma.user.count();

    // Get all user emails (for debugging)
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        createdAt: true,
      },
      take: 10, // Limit to 10 users
    });

    return res.status(200).json({
      searchedEmail: email,
      userExists: !!user,
      userHasPassword: user ? !!user.password : false,
      passwordLength: user?.password ? user.password.length : 0,
      userId: user?.id || null,
      userName: user?.name || null,
      userCreatedAt: user?.createdAt || null,
      totalUsersInDb: totalUsers,
      allUsers: allUsers,
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL?.substring(0, 30) + "...",
    });
  } catch (error) {
    console.error("Debug user error:", error);
    return res.status(500).json({
      error: "Database error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}
