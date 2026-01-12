import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { auditCreate, auditUpdate, auditDelete, createAuditLog } from "@/utils/auditLogger";

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
    case "POST":
      try {
        const canCreate = await hasPermission(userId, "suppliers", "create");
        if (!canCreate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to create suppliers" });
        }
        const { name } = req.body;
        const supplier = await prisma.supplier.create({
          data: {
            name,
            userId,
          },
        });
        
        await auditCreate(
          "Supplier",
          supplier,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );
        
        res.status(201).json(supplier);
      } catch (error) {
        console.error("Error creating supplier:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "CREATE",
            entityType: "Supplier",
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to create supplier",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to create supplier" });
      }
      break;
    case "GET":
      try {
        const canRead = await hasPermission(userId, "suppliers", "read");
        if (!canRead) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to view suppliers" });
        }
        const suppliers = await prisma.supplier.findMany();
        res.status(200).json(suppliers);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({ error: "Failed to fetch suppliers" });
      }
      break;
    case "PUT":
      try {
        const canUpdate = await hasPermission(userId, "suppliers", "update");
        if (!canUpdate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to update suppliers" });
        }
        const { id, name } = req.body;

        if (!id || !name) {
          return res.status(400).json({ error: "ID and name are required" });
        }

        const oldSupplier = await prisma.supplier.findUnique({ where: { id } });

        const updatedSupplier = await prisma.supplier.update({
          where: { id },
          data: { name },
        });

        await auditUpdate(
          "Supplier",
          updatedSupplier.id,
          updatedSupplier.name,
          oldSupplier,
          updatedSupplier,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        res.status(200).json(updatedSupplier);
      } catch (error) {
        console.error("Error updating supplier:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "UPDATE",
            entityType: "Supplier",
            entityId: req.body.id,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to update supplier",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to update supplier" });
      }
      break;
    case "DELETE":
      try {
        const canDelete = await hasPermission(userId, "suppliers", "delete");
        if (!canDelete) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to delete suppliers" });
        }
        const { id } = req.body;

        const supplier = await prisma.supplier.findUnique({
          where: { id },
        });

        if (!supplier) {
          return res.status(404).json({ error: "Supplier not found" });
        }

        await prisma.supplier.delete({
          where: { id },
        });

        await auditDelete(
          "Supplier",
          supplier,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        res.status(204).end();
      } catch (error) {
        console.error("Error deleting supplier:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "DELETE",
            entityType: "Supplier",
            entityId: req.body.id,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to delete supplier",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to delete supplier" });
      }
      break;
    default:
      res.setHeader("Allow", ["POST", "GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
