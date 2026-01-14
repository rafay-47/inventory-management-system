import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { auditUpdate, auditDelete } from "@/utils/auditLogger";
import { prisma } from "@/prisma/singleton";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method, query } = req;
  const { id } = query;
  const userId = session.id;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid invoice ID" });
  }

  switch (method) {
    case "GET": {
      try {
        const canRead = await hasPermission(userId, "sales", "read");
        if (!canRead) {
          return res.status(403).json({ 
            error: "Forbidden", 
            message: "You don't have permission to view invoices" 
          });
        }

        const invoice = await prisma.invoice.findUnique({
          where: { id },
          include: {
            order: {
              include: {
                customer: true,
                orderItems: {
                  include: {
                    product: true,
                    variant: true,
                  },
                },
              },
            },
          },
        });

        if (!invoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        return res.status(200).json(invoice);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        return res.status(500).json({ error: "Failed to fetch invoice" });
      }
    }

    case "PUT": {
      try {
        const canUpdate = await hasPermission(userId, "sales", "update");
        if (!canUpdate) {
          return res.status(403).json({ 
            error: "Forbidden", 
            message: "You don't have permission to update invoices" 
          });
        }

        const { status, dueDate, notes } = req.body;

        // Get the old invoice data before updating
        const oldInvoice = await prisma.invoice.findUnique({
          where: { id },
        });

        const invoice = await prisma.invoice.update({
          where: { id },
          data: {
            status: status || undefined,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            notes: notes !== undefined ? notes : undefined,
          },
          include: {
            order: {
              include: {
                customer: true,
                orderItems: {
                  include: {
                    product: true,
                    variant: true,
                  },
                },
              },
            },
          },
        });

        // Audit log
        await auditUpdate(
          "Invoice",
          invoice.id,
          `Invoice ${invoice.invoiceNumber}`,
          {
            status: oldInvoice?.status,
            dueDate: oldInvoice?.dueDate,
            notes: oldInvoice?.notes,
          },
          {
            status: invoice.status,
            dueDate: invoice.dueDate,
            notes: invoice.notes,
          },
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        return res.status(200).json(invoice);
      } catch (error) {
        console.error("Error updating invoice:", error);
        return res.status(500).json({ error: "Failed to update invoice" });
      }
    }

    case "DELETE": {
      try {
        const canDelete = await hasPermission(userId, "sales", "delete");
        if (!canDelete) {
          return res.status(403).json({ 
            error: "Forbidden", 
            message: "You don't have permission to delete invoices" 
          });
        }

        const invoice = await prisma.invoice.findUnique({
          where: { id },
        });

        if (!invoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        await prisma.invoice.delete({
          where: { id },
        });

        // Audit log
        await auditDelete(
          "Invoice",
          {
            id: invoice.id,
            name: `Invoice ${invoice.invoiceNumber}`,
            invoiceNumber: invoice.invoiceNumber,
          },
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        return res.status(200).json({ message: "Invoice deleted successfully" });
      } catch (error) {
        console.error("Error deleting invoice:", error);
        return res.status(500).json({ error: "Failed to delete invoice" });
      }
    }

    default: {
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
