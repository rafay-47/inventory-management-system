"use client";

import { useAuth } from "@/app/authContext";
import { Badge } from "@/components/ui/badge";
import { Shield, ShoppingCart } from "lucide-react";

export default function RoleBadge() {
  const { user, isAdmin, isSalesperson } = useAuth();

  if (!user || !user.roles || user.roles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin() && (
        <Badge variant="default" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      )}
      {isSalesperson() && !isAdmin() && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <ShoppingCart className="h-3 w-3" />
          Salesperson
        </Badge>
      )}
    </div>
  );
}
