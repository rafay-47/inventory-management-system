"use client";

import { useRouter } from "next/navigation";
import React, { Suspense, useEffect, useState, useMemo } from "react";
import Loading from "../components/Loading";
import { useAuth } from "./authContext";
import Home from "./Home";
import Login from "./login/page";

interface PageProps {
  params: Promise<{ [key: string]: any }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const PageContent: React.FC = () => {
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

  // If not logged in, show login page (shouldn't reach here due to middleware)
  if (!isLoggedIn) {
    return <Login />;
  }

  // Show home dashboard (middleware ensures only authorized users reach here)
  return <Home />;
};

const Page: React.FC<PageProps> = ({ params, searchParams }) => {
  const [resolvedParams, setResolvedParams] = useState<{
    [key: string]: any;
  } | null>(null);
  const [resolvedSearchParams, setResolvedSearchParams] = useState<{
    [key: string]: string | string[] | undefined;
  } | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParamsData = await params;
        const resolvedSearchParamsData = await searchParams;
        setResolvedParams(resolvedParamsData);
        setResolvedSearchParams(resolvedSearchParamsData);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error resolving params:", error);
        }
        setResolvedParams({});
        setResolvedSearchParams({});
      }
    };
    resolveParams();
  }, [params, searchParams]);

  // Memoize the loading state check
  const isLoading = useMemo(() => {
    return !resolvedParams || !resolvedSearchParams;
  }, [resolvedParams, resolvedSearchParams]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <PageContent />
    </Suspense>
  );
};

export default Page;
