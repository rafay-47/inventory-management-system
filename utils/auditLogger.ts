import { PrismaClient } from "@prisma/client";
import { NextApiRequest } from "next";

const prisma = new PrismaClient();

export interface AuditLogData {
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string; // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT, etc.
  entityType?: string; // Product, Category, Supplier, Order, User, etc.
  entityId?: string;
  entityName?: string;
  oldValues?: any;
  newValues?: any;
  status?: "success" | "failed" | "error";
  errorMessage?: string;
  metadata?: any;
}

export async function createAuditLog(
  data: AuditLogData,
  req?: NextApiRequest
) {
  try {
    // Extract IP and User Agent from request if available
    const ipAddress = req
      ? (req.headers["x-forwarded-for"] as string) ||
        (req.headers["x-real-ip"] as string) ||
        req.socket?.remoteAddress
      : undefined;
    const userAgent = req ? (req.headers["user-agent"] as string) : undefined;

    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : null,
        newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : null,
        ipAddress,
        userAgent,
        status: data.status || "success",
        errorMessage: data.errorMessage,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      },
    });
  } catch (error) {
    // Log to console if audit logging fails, but don't break the main operation
    console.error("Failed to create audit log:", error);
  }
}

// Helper function to extract user info from request
export function getUserFromRequest(req: any): {
  userId?: string;
  userName?: string;
  userEmail?: string;
} {
  // This assumes you have user info in req.user or similar
  // Adjust based on your authentication implementation
  const user = req.user || req.session?.user;
  return {
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
  };
}

// Specific audit log helpers for common actions
export async function auditCreate(
  entityType: string,
  entity: any,
  user: { userId?: string; userName?: string; userEmail?: string },
  req?: NextApiRequest
) {
  await createAuditLog(
    {
      ...user,
      action: "CREATE",
      entityType,
      entityId: entity.id,
      entityName: entity.name || entity.title || entity.id,
      newValues: entity,
      status: "success",
    },
    req
  );
}

export async function auditUpdate(
  entityType: string,
  entityId: string,
  entityName: string,
  oldValues: any,
  newValues: any,
  user: { userId?: string; userName?: string; userEmail?: string },
  req?: NextApiRequest
) {
  await createAuditLog(
    {
      ...user,
      action: "UPDATE",
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      status: "success",
    },
    req
  );
}

export async function auditDelete(
  entityType: string,
  entity: any,
  user: { userId?: string; userName?: string; userEmail?: string },
  req?: NextApiRequest
) {
  await createAuditLog(
    {
      ...user,
      action: "DELETE",
      entityType,
      entityId: entity.id,
      entityName: entity.name || entity.title || entity.id,
      oldValues: entity,
      status: "success",
    },
    req
  );
}

export async function auditLogin(
  user: { userId?: string; userName?: string; userEmail?: string },
  status: "success" | "failed",
  errorMessage?: string,
  req?: NextApiRequest
) {
  await createAuditLog(
    {
      ...user,
      action: "LOGIN",
      status,
      errorMessage,
    },
    req
  );
}

export async function auditLogout(
  user: { userId?: string; userName?: string; userEmail?: string },
  req?: NextApiRequest
) {
  await createAuditLog(
    {
      ...user,
      action: "LOGOUT",
      status: "success",
    },
    req
  );
}

export async function auditView(
  entityType: string,
  entityId: string,
  entityName: string,
  user: { userId?: string; userName?: string; userEmail?: string },
  req?: NextApiRequest
) {
  await createAuditLog(
    {
      ...user,
      action: "VIEW",
      entityType,
      entityId,
      entityName,
      status: "success",
    },
    req
  );
}

export async function auditExport(
  entityType: string,
  recordCount: number,
  user: { userId?: string; userName?: string; userEmail?: string },
  req?: NextApiRequest
) {
  await createAuditLog(
    {
      ...user,
      action: "EXPORT",
      entityType,
      status: "success",
      metadata: { recordCount },
    },
    req
  );
}
