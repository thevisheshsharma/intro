import { NextResponse } from 'next/server'
import { getCachedTwitterFollowings, setCachedTwitterFollowings } from '@/lib/twitter-cache'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')
  const cursor = searchParams.get('cursor')
  const username = searchParams.get('username')?.replace('@', '')

  if (!user_id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  // Try to get from cache using user_id (more reliable) or username
  const cached = await getCachedTwitterFollowings(user_id) || 
                (username ? await getCachedTwitterFollowings(username) : null)
  if (cached) {
    return NextResponse.json({ ...cached.followings, _cached: true, _fetched_at: cached.fetched_at })
  }

  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
  }

  try {
    let url = `https://api.socialapi.me/twitter/friends/list?user_id=${user_id}`
    if (cursor) {
      url += `&cursor=${cursor}`
    }
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
        'Accept': 'application/json',
      },
    })
    const data = await response.json()
    
    // Save to cache with both username and user_id if available
    if (response.ok && data.users) {
      await setCachedTwitterFollowings(username || user_id, data, user_id)
    }
    
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
