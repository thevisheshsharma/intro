import { NextRequest, NextResponse } from 'next/server'
import { triggerManualSync, type SyncStats } from '@/jobs/llama-sync'

interface SyncProtocolsResponse {
  success: boolean
  message: string
  stats?: SyncStats
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('Manual Llama protocol sync triggered via API')
    
    // Trigger the sync
    const stats = await triggerManualSync()
    
    // Determine if sync was successful
    const hasErrors = stats.errors.length > 0
    const success = stats.neo4jUpserts > 0 && !hasErrors
    
    const response: SyncProtocolsResponse = {
      success,
      message: success 
        ? `Successfully synced ${stats.neo4jUpserts} protocols in ${Math.round((stats.duration || 0) / 1000)}s`
        : hasErrors
          ? `Sync completed with errors: ${stats.errors.length} errors encountered`
          : 'Sync completed but no protocols were processed',
      stats
    }
    
    return NextResponse.json(response, { 
      status: success ? 200 : 207 // 207 = Multi-Status (partial success)
    })
    
  } catch (error) {
    console.error('Error in manual protocol sync:', error)
    
    const response: SyncProtocolsResponse = {
      success: false,
      message: 'Failed to sync protocols',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'Llama Protocol Sync',
    description: 'Manually trigger the Llama protocol sync job',
    method: 'POST',
    schedule: 'Runs automatically every Sunday at 2:00 AM UTC',
    usage: 'POST to this endpoint to trigger a manual sync'
  })
}
