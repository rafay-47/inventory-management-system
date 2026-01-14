import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { getUserRoles } from "@/middleware/roleMiddleware";
import { prisma } from "@/prisma/singleton";

/**
 * API endpoint to get current user information including roles
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's roles
    const roles = await getUserRoles(session.id);

    return res.status(200).json({
      ...user,
      roles,
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return res.status(500).json({ error: "Failed to fetch user information" });
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
