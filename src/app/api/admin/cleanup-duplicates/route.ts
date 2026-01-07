import { NextRequest, NextResponse } from 'next/server'
import { backfillScreenNameLower, deduplicateUsers, mergePrivyUsers } from '@/lib/neo4j'

// POST /api/admin/cleanup-duplicates
// This endpoint cleans up duplicate users in the Neo4j database
export async function POST(request: NextRequest) {
    try {
        // Check for admin authorization (simple secret check)
        const authHeader = request.headers.get('x-admin-secret')
        const adminSecret = process.env.ADMIN_SECRET

        if (!adminSecret || authHeader !== adminSecret) {
            console.log('❌ Unauthorized cleanup-duplicates request')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('🔧 Starting database cleanup...')

        // Step 1: Backfill screenNameLower for users missing it
        console.log('📝 Step 1: Backfilling screenNameLower...')
        const backfillCount = await backfillScreenNameLower()

        // Step 2: Merge Privy-only users with matching Twitter users
        console.log('🔗 Step 2: Merging Privy users with Twitter users...')
        const privyMerge = await mergePrivyUsers()

        // Step 3: Deduplicate users with same screenName (different case)
        console.log('🔄 Step 3: Deduplicating users...')
        const { merged, deleted } = await deduplicateUsers()

        console.log('✅ Cleanup complete!')

        return NextResponse.json({
            success: true,
            results: {
                screenNameLowerBackfilled: backfillCount,
                privyUsersMerged: privyMerge.merged,
                privyUsersDeleted: privyMerge.deleted,
                screenNamesMerged: merged,
                duplicatesDeleted: deleted
            },
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('❌ Cleanup error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
