import { NextResponse } from 'next/server'
import type { Profile } from '@/lib/profile'
import { logAPIError } from '@/lib/error-utils'
import { verifyPrivyToken } from '@/lib/privy'
import { z } from 'zod'
import { parseJsonBody, RequestValidationError } from '@/lib/security/request'

const profilePatchSchema = z.object({
  username: z.string().trim().max(50).nullable().optional(),
  full_name: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
}).strict()

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: requestedUserId } = await params
  const { userId: currentUserId, error } = await verifyPrivyToken(request)

  // Only allow users to access their own profile
  if (error || currentUserId !== requestedUserId) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  try {
    // For now, we'll just return the basic profile info
    // In a real app, you might want to fetch additional profile data from Neo4j
    const profile: Profile = {
      id: requestedUserId,
      username: null,
      full_name: null,
      email: null,
      bio: null,
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(profile)
  } catch (error) {
    logAPIError(error, 'profile GET', `/api/profile/${requestedUserId}`, currentUserId || undefined)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: requestedUserId } = await params
  const { userId: currentUserId, error } = await verifyPrivyToken(request)

  // Only allow users to update their own profile
  if (error || currentUserId !== requestedUserId) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  try {
    const updates = await parseJsonBody(request, profilePatchSchema, 8 * 1024)

    // Here you would typically update the profile in Neo4j
    // For now, we'll just return the updates
    const updatedProfile: Profile = {
      id: requestedUserId,
      username: updates.username || null,
      full_name: updates.full_name || null,
      email: null,
      bio: updates.bio || null,
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(updatedProfile)
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    logAPIError(error, 'profile PATCH', `/api/profile/${requestedUserId}`, currentUserId || undefined)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
