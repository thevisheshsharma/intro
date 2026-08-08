import { NextRequest, NextResponse } from 'next/server'
import { backfillScreenNameLower, deduplicateUsers, mergePrivyUsers } from '@/lib/neo4j'
import { requireAdminAccess } from '@/lib/security/api-access'

// POST /api/admin/cleanup-duplicates
// This endpoint cleans up duplicate users in the Neo4j database
export async function POST(request: NextRequest) {
    try {
        const unauthorized = requireAdminAccess(request)
        if (unauthorized) return unauthorized

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
        console.error('Database cleanup failed')
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
