import { NextResponse } from 'next/server'
import type { Profile } from '@/lib/profile'
import { logAPIError } from '@/lib/error-utils'
import { verifyPrivyToken } from '@/lib/privy'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId: currentUserId, error } = await verifyPrivyToken(request)

  // Only allow users to access their own profile
  if (error || currentUserId !== params.userId) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  try {
    // For now, we'll just return the basic profile info
    // In a real app, you might want to fetch additional profile data from Neo4j
    const profile: Profile = {
      id: params.userId,
      username: null,
      full_name: null,
      email: null,
      bio: null,
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(profile)
  } catch (error) {
    logAPIError(error, 'profile GET', `/api/profile/${params.userId}`, currentUserId || undefined)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId: currentUserId, error } = await verifyPrivyToken(request)

  // Only allow users to update their own profile
  if (error || currentUserId !== params.userId) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  try {
    const updates = await request.json()

    // Here you would typically update the profile in Neo4j
    // For now, we'll just return the updates
    const updatedProfile: Profile = {
      id: params.userId,
      username: updates.username || null,
      full_name: updates.full_name || null,
      email: null,
      bio: updates.bio || null,
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(updatedProfile)
  } catch (error) {
    logAPIError(error, 'profile PATCH', `/api/profile/${params.userId}`, currentUserId || undefined)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
