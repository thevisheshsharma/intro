import { NextResponse } from 'next/server'
import { getCachedTwitterFollowers, setCachedTwitterFollowers, getCachedTwitterUser, setCachedTwitterUser } from '@/lib/twitter-cache'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace('@', '')
  const user_id = searchParams.get('user_id')

  if (!username && !user_id) {
    return NextResponse.json({ error: 'Username or User ID is required' }, { status: 400 })
  }

  // Try cache first
  const cacheKey = user_id || username
  const cached = await getCachedTwitterFollowers(cacheKey!)
  if (cached) {
    return NextResponse.json({ ...cached.followers, _cached: true, _fetched_at: cached.fetched_at })
  }

  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
  }

  try {
    let resolvedUserId = user_id
    let resolvedUsername = username
    if (!resolvedUserId && resolvedUsername) {
      // Lookup user id if only username is provided
      let userObj = (await getCachedTwitterUser(resolvedUsername))?.user_data
      if (!userObj) {
        const userRes = await fetch(`https://api.socialapi.me/twitter/user/${resolvedUsername}`,
          { headers: { 'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`, 'Accept': 'application/json' } })
        userObj = await userRes.json()
        if (userRes.ok && userObj?.id) {
          await setCachedTwitterUser(resolvedUsername, userObj)
        }
      }
      if (!userObj?.id) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      resolvedUserId = userObj.id_str || userObj.id
    }

    // Fetch followers (handle pagination)
    let allFollowers: any[] = []
    let nextCursor: string | undefined = undefined
    let firstPage = true
    do {
      let url = `https://api.socialapi.me/twitter/followers/list?user_id=${resolvedUserId}&limit=200`
      if (!firstPage && nextCursor) url += `&cursor=${nextCursor}`
      const followersRes = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json'
        }
      })
      const followersText = await followersRes.text()
      let followersData
      try {
        followersData = JSON.parse(followersText)
      } catch (e) {
        console.error('Failed to parse followers response:', followersText)
        return NextResponse.json({ error: 'Invalid response from Twitter API' }, { status: 500 })
      }
      if (!followersRes.ok) {
        return NextResponse.json({ error: followersData.error || 'Failed to fetch followers', details: followersData }, { status: followersRes.status })
      }
      if (Array.isArray(followersData.users)) {
        allFollowers.push(...followersData.users)
      }
      nextCursor = followersData.next_cursor_str || followersData.next_cursor
      firstPage = false
    } while (nextCursor && nextCursor !== '0')

    // Save all followers to cache
    await setCachedTwitterFollowers(resolvedUsername || resolvedUserId!, { users: allFollowers }, resolvedUserId || undefined)
    return NextResponse.json({ users: allFollowers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch Twitter data', details: error.toString() }, { status: 500 })
  }
}
