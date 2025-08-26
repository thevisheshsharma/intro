import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { logExternalServiceError, logParsingError } from '@/lib/error-utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace('@', '')
  const user_id = searchParams.get('user_id')

  if (!username && !user_id) {
    return NextResponse.json({ error: 'Username or User ID is required' }, { status: 400 })
  }

  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
  }

  try {
    let resolvedUserId = user_id
    let resolvedUsername = username
    if (!resolvedUserId && resolvedUsername) {
      // Lookup user id if only username is provided
      const userRes = await fetch(`https://api.socialapi.me/twitter/user/${resolvedUsername}`,
        { headers: { 'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`, 'Accept': 'application/json' } })
      const userObj = await userRes.json()
      
      if (!userRes.ok || !userObj?.id) {
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
        const { userId } = getAuth(request)
        logParsingError(e, 'parsing Twitter followers response', 'JSON', userId || undefined)
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

    return NextResponse.json({ users: allFollowers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch Twitter data', details: error.toString() }, { status: 500 })
  }
}
