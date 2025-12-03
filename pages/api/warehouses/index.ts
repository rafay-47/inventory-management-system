import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method } = req;
  const userId = session.id;

  switch (method) {
    case "GET":
      try {
        const warehouses = await prisma.warehouse.findMany({
          where: { userId },
          orderBy: { name: "asc" },
        });
        return res.status(200).json(warehouses);
      } catch (error) {
        console.error("Error fetching warehouses:", error);
        return res.status(500).json({ error: "Failed to fetch warehouses" });
      }

    case "POST":
      try {
        const { name, code, address } = req.body;
        if (!name) {
          return res.status(400).json({ error: "Name is required" });
        }

        const warehouse = await prisma.warehouse.create({
          data: {
            name,
            code: code || null,
            address: address || null,
            userId,
          },
        });

        return res.status(201).json(warehouse);
      } catch (error: any) {
        console.error("Error creating warehouse:", error);
        if (error.code === "P2002") {
          return res
            .status(400)
            .json({ error: "Warehouse code must be unique" });
        }
        return res.status(500).json({ error: "Failed to create warehouse" });
      }

    case "PUT":
      try {
        const { id, name, code, address } = req.body;
        if (!id) {
          return res.status(400).json({ error: "Warehouse ID is required" });
        }

        const existingWarehouse = await prisma.warehouse.findUnique({
          where: { id },
        });

        if (!existingWarehouse || existingWarehouse.userId !== userId) {
          return res.status(404).json({ error: "Warehouse not found" });
        }

        const warehouse = await prisma.warehouse.update({
          where: { id },
          data: {
            name,
            code: code || null,
            address: address || null,
          },
        });

        return res.status(200).json(warehouse);
      } catch (error: any) {
        console.error("Error updating warehouse:", error);
        if (error.code === "P2002") {
          return res
            .status(400)
            .json({ error: "Warehouse code must be unique" });
        }
        return res.status(500).json({ error: "Failed to update warehouse" });
      }

    case "DELETE":
      try {
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ error: "Warehouse ID is required" });
        }

        const existingWarehouse = await prisma.warehouse.findUnique({
          where: { id },
        });

        if (!existingWarehouse || existingWarehouse.userId !== userId) {
          return res.status(404).json({ error: "Warehouse not found" });
        }

        await prisma.warehouse.delete({ where: { id } });
        return res.status(204).end();
      } catch (error) {
        console.error("Error deleting warehouse:", error);
        return res.status(500).json({ error: "Failed to delete warehouse" });
      }

    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
