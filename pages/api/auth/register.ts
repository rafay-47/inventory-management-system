import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["salesperson", "admin"]).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  const allowedOrigins = [
    "https://stockly-inventory.vercel.app",
    "https://stockly-inventory-managment-nextjs-ovlrz6kdv.vercel.app",
    "https://stockly-inventory-managment-nextjs-arnob-mahmuds-projects.vercel.app",
    "https://stockly-inventory-managment-n-git-cc3097-arnob-mahmuds-projects.vercel.app",
    "https://inventory-management-system-two-tan.vercel.app",
    req.headers.origin,
  ];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://stockly-inventory.vercel.app"
    );
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Check if user is authenticated and is admin (required for creating users)
  const session = await getSessionServer(req, res);
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized: Admin access required to create users" });
  }

  // Verify admin role
  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  const isAdmin = currentUser?.roles.some(
    (userRole: any) => userRole.role.name === "admin"
  );

  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required to create users" });
  }

  try {
    console.log("📝 Registration attempt by admin:", { email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { name, email, password, role = "salesperson" } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique username
    const baseUsername = email.split('@')[0];
    let username = baseUsername;
    let counter = 1;
    
    // Check if username exists and generate a unique one
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        username,
        createdAt: new Date(),
      },
    });

    // Assign role to new user (from request or default salesperson)
    try {
      const assignedRole = await prisma.role.findUnique({
        where: { name: role },
      });

      if (assignedRole) {
        await prisma.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: assignedRole.id,
          },
        });
        console.log(`✅ Assigned ${role} role to new user`);
      }
    } catch (roleError) {
      console.warn("⚠️ Could not assign role to new user:", roleError);
      // Don't fail registration if role assignment fails
    }

    console.log("✅ User registered successfully by admin:", createdUser.email);
    res.status(201).json({ id: createdUser.id, name: createdUser.name, email: createdUser.email });
  } catch (error) {
    console.error("❌ Registration error:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  } finally {
    await prisma.$disconnect();
  }
}
