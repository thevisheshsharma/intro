import { logAPIError } from './error-utils';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  updated_at: string | null;
  bio: string | null;
  // Subscription fields (Phase 2)
  plan?: 'founder' | 'standard' | 'enterprise' | null;
  subscriptionStatus?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | null;
  trialEndsAt?: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const response = await fetch(`/api/profile/${userId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch profile')
    }
    return await response.json()
  } catch (error) {
    logAPIError(error, 'fetching profile', `/api/profile/${userId}`, userId)
    return null
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const response = await fetch(`/api/profile/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error('Failed to update profile')
  }

  return await response.json()
}
