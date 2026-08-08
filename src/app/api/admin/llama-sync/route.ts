import { NextRequest, NextResponse } from 'next/server'
import { triggerManualSync, type SyncStats } from '@/jobs/llama-sync'
import { requireAdminAccess } from '@/lib/security/api-access'

interface SyncProtocolsResponse {
    success: boolean
    message: string
    stats?: SyncStats
    error?: string
    timestamp: string
}

// POST /api/admin/llama-sync
// Admin endpoint to trigger DefiLlama protocol sync with authorization
export async function POST(request: NextRequest) {
    try {
        const unauthorized = requireAdminAccess(request)
        if (unauthorized) return unauthorized

        console.log('🦙 Manual Llama protocol sync triggered via admin API')

        // Trigger the sync
        const stats = await triggerManualSync()

        // Determine if sync was successful
        const hasErrors = stats.errors.length > 0
        const success = stats.neo4jUpserts > 0 && !hasErrors

        const response: SyncProtocolsResponse = {
            success,
            message: success
                ? `✅ Successfully synced ${stats.neo4jUpserts} protocols in ${Math.round((stats.duration || 0) / 1000)}s`
                : hasErrors
                    ? `⚠️ Sync completed with errors: ${stats.errors.length} errors encountered`
                    : 'Sync completed but no protocols were processed',
            stats,
            timestamp: new Date().toISOString()
        }

        return NextResponse.json(response, {
            status: success ? 200 : 207 // 207 = Multi-Status (partial success)
        })

    } catch (error) {
        console.error('Admin protocol sync failed')

        const response: SyncProtocolsResponse = {
            success: false,
            message: 'Failed to sync protocols',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }

        return NextResponse.json(response, { status: 500 })
    }
}

// GET /api/admin/llama-sync
// Returns info about the endpoint
export async function GET(request: NextRequest) {
    const unauthorized = requireAdminAccess(request)
    if (unauthorized) return unauthorized

    return NextResponse.json({
        endpoint: 'Admin - Llama Protocol Sync',
        description: 'Manually trigger the DefiLlama protocol sync job',
        method: 'POST',
        authorization: 'Requires x-admin-secret header',
        schedule: 'Runs automatically every Sunday at 2:00 AM UTC',
        usage: {
            curl: 'curl -X POST http://localhost:3000/api/admin/llama-sync -H "x-admin-secret: YOUR_SECRET"',
            description: 'Fetches all protocols from DefiLlama API, groups by parent, and syncs to Neo4j'
        },
        stats_returned: [
            'totalProtocols - Number of protocols fetched from DefiLlama',
            'groupedProtocols - Number after grouping by parent protocol',
            'protocolsWithTwitter - Protocols with Twitter handles',
            'existingMatches - Matched with existing Neo4j users',
            'neo4jUpserts - Successfully upserted to Neo4j',
            'duration - Total sync time in milliseconds'
        ]
    })
}
