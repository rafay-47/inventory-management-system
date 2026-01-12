import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyToken } from "./utils/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define role-based route access - what each role CAN access
const roleBasedRoutes = {
  admin: [
    "/",
    "/products",
    "/purchase-orders",
    "/sales",
    "/business-insights",
    "/api-docs",
    "/api-status",
  ],
  salesperson: ["/sales"],
};

// Define default landing page for each role
const roleDefaultRoutes = {
  admin: "/",
  salesperson: "/sales",
};

async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.name);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return [];
  } finally {
    // Clean up prisma connection
    await prisma.$disconnect().catch(() => {});
  }
}

function hasAccessToRoute(userRoles: string[], path: string): boolean {
  // Check if user has access to the specific route
  for (const role of userRoles) {
    const allowedRoutes = roleBasedRoutes[role as keyof typeof roleBasedRoutes];
    if (allowedRoutes) {
      // Check if path matches any allowed route (exact match or starts with)
      const hasAccess = allowedRoutes.some(
        (route) => path === route || path.startsWith(`${route}/`)
      );
      if (hasAccess) return true;
    }
  }

  return false;
}

function getDefaultRoute(userRoles: string[]): string {
  // Admin takes precedence
  if (userRoles.includes("admin")) {
    return roleDefaultRoutes.admin;
  }
  // Otherwise use first role's default route
  for (const role of userRoles) {
    const defaultRoute = roleDefaultRoutes[role as keyof typeof roleDefaultRoutes];
    if (defaultRoute) return defaultRoute;
  }
  // Fallback
  return "/sales";
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip middleware for public routes and static assets
  const publicRoutes = ["/login", "/register", "/logout"];
  if (publicRoutes.some((route) => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Define protected routes that require authentication
  const protectedRoutes = [
    "/",
    "/products",
    "/purchase-orders",
    "/sales",
    "/business-insights",
    "/api-docs",
    "/api-status",
  ];

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const sessionToken = request.cookies.get("session_id")?.value;

    // If no session token, redirect to login
    if (
      !sessionToken ||
      sessionToken === "null" ||
      sessionToken === "undefined"
    ) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token and check role-based access
    try {
      const decoded = verifyToken(sessionToken);
      if (!decoded || !decoded.userId) {
        // Invalid token
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", path);
        return NextResponse.redirect(loginUrl);
      }

      const userRoles = await getUserRoles(decoded.userId);

      // If user has no roles, grant temporary access but log warning
      if (userRoles.length === 0) {
        console.warn(
          `⚠️  User ${decoded.userId} has no roles assigned. Allowing temporary access to: ${path}`
        );
        // Allow access but they'll get admin-level permissions from the permission check
        return NextResponse.next();
      }

      // Special handling for root path "/" - redirect to appropriate dashboard
      if (path === "/") {
        // If user is not admin, redirect to their default route
        if (!userRoles.includes("admin")) {
          const defaultRoute = getDefaultRoute(userRoles);
          const redirectUrl = new URL(defaultRoute, request.url);
          return NextResponse.redirect(redirectUrl);
        }
        // Admin can access "/"
        return NextResponse.next();
      }

      // Check if user has access to this specific route
      if (!hasAccessToRoute(userRoles, path)) {
        console.warn(
          `⚠️  User ${decoded.userId} with roles [${userRoles.join(", ")}] attempted to access unauthorized route: ${path}`
        );
        // Redirect to their default allowed route
        const defaultRoute = getDefaultRoute(userRoles);
        const unauthorizedUrl = new URL(defaultRoute, request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }

      // User has access, allow the request
      return NextResponse.next();
    } catch (error) {
      console.error("❌ Error verifying token in middleware:", error);
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
  runtime: "nodejs", // Use Node.js runtime instead of Edge runtime to support crypto module
};
