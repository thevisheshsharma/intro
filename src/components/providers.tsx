"use client";

import { AuthProvider } from "@/lib/auth-context";
import { Header } from "./header";
import { LoadingSpinner } from "./ui/loading-spinner";
import { useAuth } from "@/lib/auth-context";

function AppContent({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}
