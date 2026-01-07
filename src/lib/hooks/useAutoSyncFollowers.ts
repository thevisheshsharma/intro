import { useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { extractTwitterUsername } from '@/lib/twitter-helpers'

// 24 hour cooldown between syncs
const SYNC_COOLDOWN_MS = 24 * 60 * 60 * 1000
const SYNC_STORAGE_KEY = 'berri-last-follower-sync'

/**
 * Check if enough time has passed since last sync
 */
function shouldSync(username: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY)
    if (!stored) return true

    const data = JSON.parse(stored)
    if (data.username !== username) return true

    const lastSync = new Date(data.timestamp).getTime()
    const now = Date.now()
    return now - lastSync > SYNC_COOLDOWN_MS
  } catch {
    return true
  }
}

/**
 * Mark sync as complete
 */
function markSynced(username: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({
      username,
      timestamp: new Date().toISOString()
    }))
  } catch {
    // Ignore storage errors
  }
}

// Hook to automatically sync followers when user logs in
export function useAutoSyncFollowers() {
  const { user, ready, authenticated } = usePrivy()
  const syncInProgress = useRef(false)

  useEffect(() => {
    if (!ready || !authenticated || !user || syncInProgress.current) return

    const twitterUsername = extractTwitterUsername(user)
    if (!twitterUsername) return

    // Check 24-hour cooldown using localStorage
    if (!shouldSync(twitterUsername)) {
      console.log(`Skipping follower sync for ${twitterUsername} (within 24hr cooldown)`)
      return
    }

    // Mark sync in progress to prevent race conditions
    syncInProgress.current = true

    // Trigger background sync (non-blocking)
    const syncFollowers = async () => {
      try {
        console.log(`Auto-syncing followers for ${twitterUsername}`)

        const response = await fetch('/api/user/sync-followers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: twitterUsername
          })
        })

        const data = await response.json()

        if (response.ok) {
          console.log(`Follower sync result:`, data)
          if (data.synced) {
            console.log(`Synced ${data.followerCount} followers for ${twitterUsername}`)
          } else {
            console.log(`Followers already up-to-date for ${twitterUsername}`)
          }
          // Mark sync complete in localStorage
          markSynced(twitterUsername)
        } else {
          console.warn(`Failed to sync followers: ${data.error}`)
        }
      } catch (error) {
        console.warn(`Background follower sync failed:`, error)
      } finally {
        syncInProgress.current = false
      }
    }

    // Run sync in background without blocking UI
    syncFollowers()

  }, [ready, authenticated, user])

  return {
    isUserLoaded: ready,
    hasTwitterUsername: ready && authenticated && user ? !!extractTwitterUsername(user) : false
  }
}
