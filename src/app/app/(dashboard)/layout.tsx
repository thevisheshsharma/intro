'use client'

import { useState, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Sidebar from '@/components/Sidebar'
import { useAutoSyncFollowers } from '@/lib/hooks/useAutoSyncFollowers'
import { useUserSession } from '@/lib/hooks/useUserSession'
import { TrialBanner } from '@/components/subscription/TrialBanner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, ready, authenticated } = usePrivy()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Auto-sync followers on login (non-blocking background task)
  useAutoSyncFollowers()

  // Get subscription data from cached session (shared with TrialBanner)
  const { subscription } = useUserSession()

  // Get display name from Privy user
  const getDisplayName = useCallback(() => {
    if (!user) return 'User'

    // Try Twitter first
    const twitterAccount = user.linkedAccounts?.find(
      (account: any) => account.type === 'twitter_oauth'
    )
    if ((twitterAccount as any)?.username) return (twitterAccount as any).username

    // Try email
    const emailAccount = user.linkedAccounts?.find(
      (account: any) => account.type === 'email'
    )
    if ((emailAccount as any)?.address) return (emailAccount as any).address.split('@')[0]

    // Try wallet
    const walletAccount = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet'
    )
    if ((walletAccount as any)?.address) {
      return `${(walletAccount as any).address.slice(0, 6)}...${(walletAccount as any).address.slice(-4)}`
    }

    return 'User'
  }, [user])

  // Only block on Privy ready state - not on data loading
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    )
  }

  const displayName = getDisplayName()

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Trial Banner - shows at top when in trial or expired */}
      {authenticated && (
        <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${sidebarCollapsed ? 'ml-[90px]' : 'ml-[278px]'}`}>
          <TrialBanner />
        </div>
      )}

      {/* Sidebar */}
      {authenticated && (
        <Sidebar
          displayName={displayName}
          plan={subscription?.plan || null}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}

      {/* Main Content - offset for sidebar + its margin */}
      <main
        className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-[90px]' : 'ml-[278px]'}`}
      >
        {children}
      </main>
    </div>
  )
}
