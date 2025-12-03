"use client";

import { Card } from "@/components/ui/card";
import React from "react";
import AppHeader from "../AppHeader/AppHeader";
import SideNav from "./SideNav";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  children,
  showHeader = true
}) => {
  return (
    <div className="poppins w-full min-h-screen bg-gray-50 dark:bg-[#121212]">
      <Card className="flex flex-col lg:flex-row shadow-none gap-4 lg:gap-6 lg:mx-8 lg:my-6 lg:rounded-lg lg:border lg:shadow-md">
        <SideNav />
        <div className="flex-1 flex flex-col space-y-4 lg:space-y-6">
          {showHeader && <AppHeader />}
          <div className="p-0 lg:p-4">{children}</div>
        </div>
      </Card>
    </div>
  );
};

export default AuthenticatedLayout;
