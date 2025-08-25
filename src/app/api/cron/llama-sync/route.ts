import { NextRequest, NextResponse } from 'next/server'
import { triggerManualSync } from '@/jobs/llama-sync'

/**
 * Cron job endpoint for automated protocol sync
 * This endpoint should be called by an external cron service (e.g., GitHub Actions, Vercel Cron, etc.)
 * or by a cron job running on the server
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (optional - add auth token check)
    const authToken = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'llama-sync-token'
    
    if (authToken !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }
    
    console.log('Automated Llama protocol sync triggered')
    
    // Trigger the sync
    const stats = await triggerManualSync()
    
    // Log the results
    console.log('Automated sync completed:', {
      processed: stats.neo4jUpserts,
      duration: stats.duration,
      errors: stats.errors.length
    })
    
    const success = stats.neo4jUpserts > 0 && stats.errors.length === 0
    
    return NextResponse.json({
      success,
      message: `Automated sync completed: ${stats.neo4jUpserts} protocols processed`,
      stats,
      timestamp: new Date().toISOString()
    }, { 
      status: success ? 200 : 207 
    })
    
  } catch (error) {
    console.error('Error in automated protocol sync:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Also support POST requests for webhook compatibility
  return GET(request)
}
