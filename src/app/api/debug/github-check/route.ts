import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationProperties } from '@/services'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username') || 'arbitrum'
    
    console.log(`🔍 Fetching organization properties for: ${username}`)
    
    const orgData = await getOrganizationProperties(username)
    
    if (!orgData) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      userId: orgData.userId,
      screenName: orgData.screenName,
      github_url: (orgData as any).github_url,
      github_url_type: typeof (orgData as any).github_url,
      allKeys: Object.keys(orgData).sort(),
      urlKeys: Object.keys(orgData).filter(k => k.includes('github') || k.includes('url')),
      protocolKeys: Object.keys(orgData).filter(k => k.includes('llama') || k.includes('protocol'))
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
