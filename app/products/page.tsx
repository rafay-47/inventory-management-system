"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppTable from "@/app/AppTable/AppTable";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import Loading from "@/components/Loading";
import { useAuth } from "@/app/authContext";

export default function ProductsPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    // Only redirect after auth check is complete
    if (!isLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return <Loading />;
  }

  if (!isLoggedIn) {
    return <Loading />;
  }

  return (
    <AuthenticatedLayout>
      <AppTable />
    </AuthenticatedLayout>
  );
}
