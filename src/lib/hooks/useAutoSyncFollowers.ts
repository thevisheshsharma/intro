import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { extractTwitterUsername } from '@/lib/twitter-helpers'

// Hook to automatically sync followers when user logs in
export function useAutoSyncFollowers() {
  const { user, isLoaded } = useUser()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (!isLoaded || !user || hasSynced.current) return

    const twitterUsername = extractTwitterUsername(user)
    if (!twitterUsername) return

    // Mark as synced to prevent multiple calls
    hasSynced.current = true

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
            console.log(`✅ Synced ${data.followerCount} followers for ${twitterUsername}`)
          } else {
            console.log(`ℹ️  Followers already up-to-date for ${twitterUsername}`)
          }
        } else {
          console.warn(`Failed to sync followers: ${data.error}`)
        }
      } catch (error) {
        console.warn(`Background follower sync failed:`, error)
        // Reset flag so it can retry later if needed
        hasSynced.current = false
      }
    }

    // Run sync in background without blocking UI
    syncFollowers()
    
  }, [isLoaded, user])

  return {
    isUserLoaded: isLoaded,
    hasTwitterUsername: isLoaded && user ? !!extractTwitterUsername(user) : false
  }
}
