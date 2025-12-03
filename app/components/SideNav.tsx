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
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Products", href: "/products", icon: PackageOpen },
  { label: "Purchase Orders", href: "/purchase-orders", icon: Truck },
  { label: "Sales", href: "/sales", icon: ShoppingCart },
  // { label: "Business Insights", href: "/business-insights", icon: BarChart3 },
  // { label: "API Status", href: "/api-status", icon: Server },
  // { label: "API Docs", href: "/api-docs", icon: BookOpen },
];

export default function SideNav() {
  const pathname = usePathname() || "";

  const renderLinks = (variant: "desktop" | "mobile") => (
    <nav
      className={cn(
        "flex gap-1",
        variant === "desktop"
          ? "flex-col"
          : "flex-row w-full overflow-x-auto pb-2"
      )}
    >
      {navItems.map(({ label, href, icon: Icon }) => {
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
