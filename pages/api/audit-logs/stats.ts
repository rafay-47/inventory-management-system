import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { prisma } from "@/prisma/singleton";

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
      const { period = "7d" } = req.query;

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case "24h":
          startDate.setHours(now.getHours() - 24);
          break;
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Total logs in period
      const totalLogs = await prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      });

      // Logs by action
      const logsByAction = await prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { action: "desc" } },
      });

      // Logs by entity type
      const logsByEntity = await prisma.auditLog.groupBy({
        by: ["entityType"],
        _count: { entityType: true },
        where: {
          createdAt: { gte: startDate },
          entityType: { not: null },
        },
        orderBy: { _count: { entityType: "desc" } },
      });

      // Logs by status
      const logsByStatus = await prisma.auditLog.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { createdAt: { gte: startDate } },
      });

      // Most active users
      const mostActiveUsers = await prisma.auditLog.groupBy({
        by: ["userId", "userName"],
        _count: { userId: true },
        where: {
          createdAt: { gte: startDate },
          userId: { not: null },
        },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      });

      // Recent failed actions
      const recentFailures = await prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ["failed", "error"] },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          userName: true,
          userEmail: true,
          errorMessage: true,
          createdAt: true,
        },
      });

      // Daily activity (last 7 days)
      const dailyActivity = await prisma.$queryRaw<
        Array<{ date: Date; count: bigint }>
      >`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "AuditLog"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `;

      return res.status(200).json({
        period,
        totalLogs,
        logsByAction: logsByAction.map((item) => ({
          action: item.action,
          count: item._count.action,
        })),
        logsByEntity: logsByEntity.map((item) => ({
          entityType: item.entityType,
          count: item._count.entityType,
        })),
        logsByStatus: logsByStatus.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
        mostActiveUsers: mostActiveUsers.map((item) => ({
          userId: item.userId,
          userName: item.userName,
          count: item._count.userId,
        })),
        recentFailures,
        dailyActivity: dailyActivity.map((item) => ({
          date: item.date,
          count: Number(item.count),
        })),
      });
    } catch (error: any) {
      console.error("Error fetching audit statistics:", error);
      return res.status(500).json({ error: error.message });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
