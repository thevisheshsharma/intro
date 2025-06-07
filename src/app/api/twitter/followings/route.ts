import { NextResponse } from 'next/server'
import { getCachedTwitterUser, setCachedTwitterUser, getCachedTwitterFollowings, setCachedTwitterFollowings } from '@/lib/twitter-cache'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace('@', '')

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  // Check followings cache first by username
  const cachedFollowings = await getCachedTwitterFollowings(username)
  if (cachedFollowings) {
    return NextResponse.json({ ...cachedFollowings.followings, _cached: true, _fetched_at: cachedFollowings.fetched_at })
  }

  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    console.error('SOCIALAPI_BEARER_TOKEN is not set')
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
  }

  try {
    // First get the user data using the username (check user cache)
    let userData = await getCachedTwitterUser(username)
    let userObj = userData?.user_data
    if (!userObj) {
      const userResponse = await fetch(`https://api.socialapi.me/twitter/user/${username}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json'
        }
      })
      const responseText = await userResponse.text()
      try {
        userObj = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse user response:', responseText)
        return NextResponse.json({ error: 'Invalid response from Twitter API' }, { status: 500 })
      }
      if (userResponse.ok && userObj.id) {
        await setCachedTwitterUser(username, userObj)
      }
    }
    if (!userObj || !userObj.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Then get all their followings (handle pagination)
    let allFollowings: any[] = []
    let nextCursor: string | undefined = undefined
    let firstPage = true
    do {
      let url = `https://api.socialapi.me/twitter/friends/list?user_id=${userObj.id}` // use max limit
      if (!firstPage && nextCursor) url += `&cursor=${nextCursor}`
      const followingsResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json'
        }
      })
      const followingsText = await followingsResponse.text()
      let followingsData
      try {
        followingsData = JSON.parse(followingsText)
      } catch (e) {
        console.error('Failed to parse followings response:', followingsText)
        return NextResponse.json({ error: 'Invalid response from Twitter API' }, { status: 500 })
      }
      if (!followingsResponse.ok) {
        return NextResponse.json({ 
          error: followingsData.error || 'Failed to fetch followings',
          details: followingsData
        }, { status: followingsResponse.status })
      }
      if (Array.isArray(followingsData.users)) {
        allFollowings.push(...followingsData.users)
      }
      nextCursor = followingsData.next_cursor_str || followingsData.next_cursor
      firstPage = false
    } while (nextCursor && nextCursor !== '0')

    const userId = userObj.id_str || userObj.id
    // Save all followings to cache with both username and user_id
    await setCachedTwitterFollowings(username, { users: allFollowings }, userId)

    return NextResponse.json({ users: allFollowings })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch Twitter data',
      details: error.toString()
    }, { status: 500 })
  }
}
