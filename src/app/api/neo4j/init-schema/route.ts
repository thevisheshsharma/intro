import { NextRequest, NextResponse } from 'next/server'
import { initializeSchema } from '@/services'
import { requireAdminAccess } from '@/lib/security/api-access'

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAccess(request)
  if (unauthorized) return unauthorized

  try {
    await initializeSchema()
    
    return NextResponse.json({
      success: true,
      message: 'Neo4j schema initialized successfully'
    })
  } catch (error: any) {
    console.error('Neo4j schema initialization failed')
    return NextResponse.json(
      { error: 'Failed to initialize schema' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
