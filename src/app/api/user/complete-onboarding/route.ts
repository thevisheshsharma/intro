import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { markOnboardingComplete } from '@/lib/subscription'

/**
 * POST /api/user/complete-onboarding
 *
 * Marks the user's onboarding as complete in the database.
 * This provides server-side tracking in addition to the cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await verifyPrivyToken(request)

    if (authError || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await markOnboardingComplete(userId)

    return NextResponse.json({
      success: true,
      message: 'Onboarding marked as complete'
    })
  } catch (error: any) {
    console.error('[Onboarding Complete] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to complete onboarding',
        details: error.message
      },
      { status: 500 }
    )
  }
}
