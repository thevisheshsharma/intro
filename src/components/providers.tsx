"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "./header";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <Header />
      {children}
    </ClerkProvider>
  );
}
