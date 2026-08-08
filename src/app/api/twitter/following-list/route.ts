import { NextResponse } from 'next/server'
import { COST_BEARING_RATE_LIMITS, requireUserAccess } from '@/lib/security/api-access'

export async function GET(request: Request) {
  const access = await requireUserAccess(request, {
    feature: 'pathfinder',
    rateLimit: COST_BEARING_RATE_LIMITS.socialProxy,
  })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')
  const cursor = searchParams.get('cursor')
  const username = searchParams.get('username')?.replace('@', '')

  if (!user_id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
  }

  try {
    let allFollowings = []
    let nextCursor = cursor || undefined
    let firstPage = true
    do {
      let url = `https://api.socialapi.me/twitter/friends/list?user_id=${user_id}&count=200`
      if (!firstPage && nextCursor) url += `&cursor=${nextCursor}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json',
        },
      })
      const data = await response.json()
      if (!response.ok) {
        return NextResponse.json({ error: data.error || 'Failed to fetch followings', details: data }, { status: response.status })
      }
      if (Array.isArray(data.users)) {
        allFollowings.push(...data.users)
      }
      nextCursor = data.next_cursor_str || data.next_cursor
      firstPage = false
    } while (nextCursor && nextCursor !== '0')

    return NextResponse.json({ users: allFollowings })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch Twitter data' }, { status: 500 })
  }
}
