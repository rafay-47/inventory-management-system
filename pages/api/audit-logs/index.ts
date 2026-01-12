import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

// Helper to verify user is admin
async function verifyAdminAccess(req: NextApiRequest, res: NextApiResponse): Promise<{ userId: string; roles: string[] } | null> {
  const session = await getSessionServer(req, res);
  if (!session) return null;

  // Fetch user with roles
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) return null;

  const userRoles = user.roles.map((ur) => ur.role.name);
  
  // Check if user has admin role
  if (!userRoles.includes("admin")) {
    return null;
  }
  
  return { userId: user.id, roles: userRoles };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify admin access
  const admin = await verifyAdminAccess(req, res);
  if (!admin) {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  if (req.method === "GET") {
    try {
      const {
        page = "1",
        limit = "50",
        action,
        entityType,
        userId,
        status,
        startDate,
        endDate,
        search,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter conditions
      const where: any = {};

      if (action) where.action = action as string;
      if (entityType) where.entityType = entityType as string;
      if (userId) where.userId = userId as string;
      if (status) where.status = status as string;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      if (search) {
        where.OR = [
          { userName: { contains: search as string, mode: "insensitive" } },
          { userEmail: { contains: search as string, mode: "insensitive" } },
          { entityName: { contains: search as string, mode: "insensitive" } },
          { action: { contains: search as string, mode: "insensitive" } },
        ];
      }

      // Get total count
      const total = await prisma.auditLog.count({ where });

      // Get audit logs
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Get summary statistics
      const stats = await prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        where: startDate || endDate ? { createdAt: where.createdAt } : {},
      });

      const summary = {
        totalLogs: total,
        actionBreakdown: stats.map((s) => ({
          action: s.action,
          count: s._count.action,
        })),
      };

      return res.status(200).json({
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        summary,
      });
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      return res.status(500).json({ error: error.message });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
