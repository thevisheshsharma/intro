"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "./header";
import { JobInitializer } from "./job-initializer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <JobInitializer />
      <Header />
      {children}
    </ClerkProvider>
  );
}
