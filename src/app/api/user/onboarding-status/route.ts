import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { isOnboardingComplete } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/onboarding-status
 *
 * Check if the user has completed onboarding (server-side source of truth)
 */
export async function GET(request: NextRequest) {
    try {
        const { userId, error: authError } = await verifyPrivyToken(request)

        if (authError || !userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const completed = await isOnboardingComplete(userId)

        return NextResponse.json({
            completed,
            userId
        })
    } catch (error: any) {
        console.error('[Onboarding Status] Error:', error)
        return NextResponse.json(
            { error: 'Failed to check onboarding status', completed: false },
            { status: 500 }
        )
    }
}
