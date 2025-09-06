import { NextRequest, NextResponse } from 'next/server'
import { syncLlamaProtocols } from '@/jobs/llama-sync'

export async function GET(request: NextRequest) {
  try {
    console.log('Running Llama integration test...')
    const result = await syncLlamaProtocols()
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Test API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
