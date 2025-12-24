import type { TwoPOVMutualsResult } from '@/services'

// Simple in-memory LRU cache with TTL for mutual finding results
interface CachedMutualsResult {
  result: TwoPOVMutualsResult
  timestamp: number
}

const cache = new Map<string, CachedMutualsResult>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 1000

/**
 * Generate cache key from usernames
 */
function getCacheKey(aUsername: string, bUsername: string): string {
  return `${aUsername.toLowerCase()}:${bUsername.toLowerCase()}`
}

/**
 * Get cached mutuals result if fresh
 */
export function getCachedMutuals(aUsername: string, bUsername: string): TwoPOVMutualsResult | null {
  const key = getCacheKey(aUsername, bUsername)
  const cached = cache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`📦 Cache HIT for ${key}`)
    return cached.result
  }

  // Clean up expired entry
  if (cached) {
    cache.delete(key)
  }

  return null
}

/**
 * Store mutuals result in cache
 */
export function setCachedMutuals(aUsername: string, bUsername: string, result: TwoPOVMutualsResult): void {
  const key = getCacheKey(aUsername, bUsername)

  // Evict oldest entries if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    // Simple LRU: delete first (oldest) entry
    const oldestKey = cache.keys().next().value
    if (oldestKey) {
      cache.delete(oldestKey)
      console.log(`🗑️ Cache evicted oldest entry: ${oldestKey}`)
    }
  }

  cache.set(key, { result, timestamp: Date.now() })
  console.log(`📦 Cache SET for ${key} (size: ${cache.size})`)
}

/**
 * Invalidate cache for a specific user pair
 */
export function invalidateMutualsCache(aUsername: string, bUsername: string): void {
  const key = getCacheKey(aUsername, bUsername)
  if (cache.delete(key)) {
    console.log(`🗑️ Cache invalidated for ${key}`)
  }
}

/**
 * Invalidate all cache entries involving a specific user
 */
export function invalidateUserCache(username: string): void {
  const usernameLower = username.toLowerCase()
  let count = 0
  const keysToDelete: string[] = []

  cache.forEach((_, key) => {
    if (key.includes(usernameLower)) {
      keysToDelete.push(key)
    }
  })

  for (const key of keysToDelete) {
    cache.delete(key)
    count++
  }

  if (count > 0) {
    console.log(`🗑️ Cache invalidated ${count} entries for user ${username}`)
  }
}

/**
 * Clear entire cache
 */
export function clearMutualsCache(): void {
  const size = cache.size
  cache.clear()
  console.log(`🗑️ Cache cleared (was ${size} entries)`)
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  }
}
