"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppTable from "@/app/AppTable/AppTable";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import Loading from "@/components/Loading";
import { useAuth } from "@/app/authContext";

export default function ProductsPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return <Loading />;
  }

  return (
    <AuthenticatedLayout>
      <AppTable />
    </AuthenticatedLayout>
  );
}
