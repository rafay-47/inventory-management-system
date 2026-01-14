import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/prisma/singleton";
import { roleCache, permissionCache } from "@/lib/cache";

// Define role names
export enum UserRoles {
  ADMIN = "admin",
  SALESPERSON = "salesperson",
}

// Define permissions for each resource/action combination
export const RolePermissions = {
  [UserRoles.ADMIN]: {
    products: ["read", "create", "update", "delete"],
    suppliers: ["read", "create", "update", "delete"],
    categories: ["read", "create", "update", "delete"],
    warehouses: ["read", "create", "update", "delete"],
    variants: ["read", "create", "update", "delete"],
    purchaseOrders: ["read", "create", "update", "delete", "receive"],
    sales: ["read", "create", "update", "delete"],
    customers: ["read", "create", "update", "delete"],
  },
  [UserRoles.SALESPERSON]: {
    products: ["read"],
    suppliers: ["read"],
    categories: ["read"],
    warehouses: ["read"],
    variants: ["read"],
    purchaseOrders: [],
    sales: ["read", "create"],
    customers: ["read", "create", "update"],
  },
};

// Get user's roles from the database (with caching)
export async function getUserRoles(userId: string): Promise<string[]> {
  const cacheKey = `roles:${userId}`;
  
  // Check cache first
  const cached = roleCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch from database
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  
  const roles = userRoles.map((ur) => ur.role.name);
  
  // Cache the result
  roleCache.set(cacheKey, roles);
  
  return roles;
}

// Check if user has a specific role
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(roleName);
}

// Check if user has permission for a specific resource and action (with caching)
export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const cacheKey = `perm:${userId}:${resource}:${action}`;
  
  // Check cache first
  const cached = permissionCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch roles
  const roles = await getUserRoles(userId);

  // If user has no roles, grant admin-level access for backwards compatibility
  // This allows existing users to continue working while roles are being assigned
  if (roles.length === 0) {
    console.warn(`User ${userId} has no roles assigned. Granting temporary admin access.`);
    permissionCache.set(cacheKey, true);
    return true;
  }

  // Admin has all permissions
  if (roles.includes(UserRoles.ADMIN)) {
    permissionCache.set(cacheKey, true);
    return true;
  }

  // Check permissions for each role
  for (const roleName of roles) {
    const permissions = RolePermissions[roleName as UserRoles];
    if (permissions) {
      const resourcePermissions = permissions[resource as keyof typeof permissions] as string[] | undefined;
      if (resourcePermissions && resourcePermissions.includes(action)) {
        permissionCache.set(cacheKey, true);
        return true;
      }
    }
  }

  permissionCache.set(cacheKey, false);
  return false;
}

// Middleware to check if user has required role
export const requireRole = (requiredRoles: string[]) => {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void
  ) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRoles = await getUserRoles(user.id);
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: "Forbidden",
        message: `You need one of these roles: ${requiredRoles.join(", ")}`,
      });
    }

    next();
  };
};

// Middleware to check if user has required permission
export const requirePermission = (resource: string, action: string) => {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void
  ) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = await hasPermission(user.id, resource, action);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Forbidden",
        message: `You don't have permission to ${action} ${resource}`,
      });
    }

    next();
  };
};

// Helper to wrap API handler with permission check
export const withPermission = (
  resource: string,
  action: string,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = await hasPermission(user.id, resource, action);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Forbidden",
        message: `You don't have permission to ${action} ${resource}`,
      });
    }

    return handler(req, res);
  };
};

// Attach user roles to request for easier access
export const attachUserRoles = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  const user = (req as any).user;

  if (user) {
    const roles = await getUserRoles(user.id);
    (req as any).userRoles = roles;
  }

  next();
};

// Export cache invalidation function for when roles change
export const invalidateUserCache = (userId: string) => {
  roleCache.invalidateUser(userId);
  permissionCache.invalidateUser(userId);
};
