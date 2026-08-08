"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { polygon, mainnet, base } from "viem/chains";
import { JobInitializer } from "./job-initializer";
import { AuthRedirectHandler } from "./AuthRedirectHandler";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside component to avoid SSR issues
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache data for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      })
  );

  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!privyAppId) {
    return (
      <QueryClientProvider client={queryClient}>
        <main className="flex min-h-screen items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Berri is not configured</h1>
            <p className="mt-2 text-sm text-gray-600">
              Set NEXT_PUBLIC_PRIVY_APP_ID to enable authentication.
            </p>
          </div>
        </main>
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["wallet", "twitter", "email"],
        appearance: {
          theme: "light",
          accentColor: "#E54868",
          logo: "/berri-logo.svg",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: polygon,
        supportedChains: [mainnet, polygon, base],
      }}
    >
      <JobInitializer />
      <AuthRedirectHandler />
      {children}
    </PrivyProvider>
    </QueryClientProvider>
  );
}
