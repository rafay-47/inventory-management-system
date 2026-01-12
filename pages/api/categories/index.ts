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
  const userId = session.id; // Use session.id to get the user ID

  switch (method) {
    case "POST":
      try {
        const canCreate = await hasPermission(userId, "categories", "create");
        if (!canCreate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to create categories" });
        }
        const { name } = req.body;
        const category = await prisma.category.create({
          data: {
            name,
            userId,
          },
        });
        
        await auditCreate(
          "Category",
          category,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );
        
        res.status(201).json(category);
      } catch (error) {
        console.error("Error creating category:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "CREATE",
            entityType: "Category",
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to create category",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to create category" });
      }
      break;
    case "GET":
      try {
        const canRead = await hasPermission(userId, "categories", "read");
        if (!canRead) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to view categories" });
        }
        const categories = await prisma.category.findMany();
        res.status(200).json(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
      }
      break;
    case "PUT":
      try {
        const canUpdate = await hasPermission(userId, "categories", "update");
        if (!canUpdate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to update categories" });
        }
        const { id, name } = req.body;

        if (!id || !name) {
          return res.status(400).json({ error: "ID and name are required" });
        }

        const oldCategory = await prisma.category.findUnique({ where: { id } });

        const updatedCategory = await prisma.category.update({
          where: { id },
          data: { name },
        });

        await auditUpdate(
          "Category",
          updatedCategory.id,
          updatedCategory.name,
          oldCategory,
          updatedCategory,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        res.status(200).json(updatedCategory);
      } catch (error) {
        console.error("Error updating category:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "UPDATE",
            entityType: "Category",
            entityId: req.body.id,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to update category",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to update category" });
      }
      break;
    case "DELETE":
      try {
        const canDelete = await hasPermission(userId, "categories", "delete");
        if (!canDelete) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to delete categories" });
        }
        const { id } = req.body;
        console.log("Deleting category with ID:", id); // Debug statement

        // Check if the category exists
        const category = await prisma.category.findUnique({
          where: { id },
        });

        if (!category) {
          return res.status(404).json({ error: "Category not found" });
        }

        const deleteResponse = await prisma.category.delete({
          where: { id },
        });

        console.log("Delete response:", deleteResponse); // Debug statement

        await auditDelete(
          "Category",
          category,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        res.status(204).end();
      } catch (error) {
        console.error("Error deleting category:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "DELETE",
            entityType: "Category",
            entityId: req.body.id,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to delete category",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to delete category" });
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
