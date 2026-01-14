import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { auditCreate, auditUpdate, auditDelete, createAuditLog } from "@/utils/auditLogger";
import { prisma } from "@/prisma/singleton";

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
        const canRead = await hasPermission(userId, "warehouses", "read");
        if (!canRead) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to view warehouses" });
        }
        const warehouses = await prisma.warehouse.findMany({
          orderBy: { name: "asc" },
        });
        return res.status(200).json(warehouses);
      } catch (error) {
        console.error("Error fetching warehouses:", error);
        return res.status(500).json({ error: "Failed to fetch warehouses" });
      }

    case "POST":
      try {
        const canCreate = await hasPermission(userId, "warehouses", "create");
        if (!canCreate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to create warehouses" });
        }
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

        await auditCreate(
          "Warehouse",
          warehouse,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        return res.status(201).json(warehouse);
      } catch (error: any) {
        console.error("Error creating warehouse:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "CREATE",
            entityType: "Warehouse",
            status: "error",
            errorMessage: error.code === "P2002" ? "Warehouse code must be unique" : error.message,
          },
          req
        );
        
        if (error.code === "P2002") {
          return res
            .status(400)
            .json({ error: "Warehouse code must be unique" });
        }
        return res.status(500).json({ error: "Failed to create warehouse" });
      }

    case "PUT":
      try {
        const canUpdate = await hasPermission(userId, "warehouses", "update");
        if (!canUpdate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to update warehouses" });
        }
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

        await auditUpdate(
          "Warehouse",
          warehouse.id,
          warehouse.name,
          existingWarehouse,
          warehouse,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        return res.status(200).json(warehouse);
      } catch (error: any) {
        console.error("Error updating warehouse:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "UPDATE",
            entityType: "Warehouse",
            entityId: req.body.id,
            status: "error",
            errorMessage: error.code === "P2002" ? "Warehouse code must be unique" : error.message,
          },
          req
        );
        
        if (error.code === "P2002") {
          return res
            .status(400)
            .json({ error: "Warehouse code must be unique" });
        }
        return res.status(500).json({ error: "Failed to update warehouse" });
      }

    case "DELETE":
      try {
        const canDelete = await hasPermission(userId, "warehouses", "delete");
        if (!canDelete) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to delete warehouses" });
        }
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ error: "Warehouse ID is required" });
        }

        const existingWarehouse = await prisma.warehouse.findUnique({
          where: { id },
        });

        if (!existingWarehouse) {
          return res.status(404).json({ error: "Warehouse not found" });
        }

        await prisma.warehouse.delete({ where: { id } });
        
        await auditDelete(
          "Warehouse",
          existingWarehouse,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );
        
        return res.status(204).end();
      } catch (error) {
        console.error("Error deleting warehouse:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "DELETE",
            entityType: "Warehouse",
            entityId: req.body.id,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to delete warehouse",
          },
          req
        );
        
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
