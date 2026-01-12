"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Home,
  PackageOpen,
  Server,
  ShoppingCart,
  Truck,
  ScrollText,
  Users,
  FileText,
} from "lucide-react";
import { useAuth } from "@/app/authContext";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[]; // If specified, only these roles can see this item. If undefined, all roles can see it.
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Home, roles: ["admin"] },
  { label: "Products", href: "/products", icon: PackageOpen, roles: ["admin"] },
  { label: "Purchase Orders", href: "/purchase-orders", icon: Truck, roles: ["admin"] },
  { label: "Sales", href: "/sales", icon: ShoppingCart }, // Available to all roles
  { label: "Invoices", href: "/invoices", icon: FileText }, // Available to all roles
  { label: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, roles: ["admin"] },
  // { label: "Business Insights", href: "/business-insights", icon: BarChart3, roles: ["admin"] },
  // { label: "API Status", href: "/api-status", icon: Server, roles: ["admin"] },
  // { label: "API Docs", href: "/api-docs", icon: BookOpen, roles: ["admin"] },
];

export default function SideNav() {
  const pathname = usePathname() || "";
  const { user } = useAuth();

  // Filter nav items based on user roles
  const visibleNavItems = navItems.filter((item) => {
    // If no roles specified, item is visible to everyone
    if (!item.roles) return true;
    
    // If user has no roles, hide restricted items
    if (!user?.roles || user.roles.length === 0) return false;
    
    // Check if user has any of the required roles
    return item.roles.some((role) => user.roles?.includes(role));
  });

  const renderLinks = (variant: "desktop" | "mobile") => (
    <nav
      className={cn(
        "flex gap-1",
        variant === "desktop"
          ? "flex-col"
          : "flex-row w-full overflow-x-auto pb-2"
      )}
    >
      {visibleNavItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const baseClasses =
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              baseClasses,
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:bg-card lg:px-4 lg:py-6">
        <div className="text-xs font-semibold uppercase text-muted-foreground mb-4">
          Navigation
        </div>
        {renderLinks("desktop")}
      </aside>
      <div className="lg:hidden px-2 pt-2">{renderLinks("mobile")}</div>
    </>
  );
}
