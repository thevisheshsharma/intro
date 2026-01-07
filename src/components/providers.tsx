"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { JobInitializer } from "./job-initializer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <JobInitializer />
      {children}
    </ClerkProvider>
  );
}
