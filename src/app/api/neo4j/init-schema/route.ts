import { NextRequest, NextResponse } from 'next/server'
import { initializeSchema } from '@/services'

export async function POST(request: NextRequest) {
  try {
    await initializeSchema()
    
    return NextResponse.json({
      success: true,
      message: 'Neo4j schema initialized successfully'
    })
  } catch (error: any) {
    console.error('Error initializing Neo4j schema:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize schema' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
