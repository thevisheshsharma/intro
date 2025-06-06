import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace('@', '')

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    console.error('SOCIALAPI_BEARER_TOKEN is not set')
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
  }

  try {
    // First get the user data using the username
    const userResponse = await fetch(`https://api.socialapi.me/twitter/user/${username}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
        'Accept': 'application/json'
      }
    })

    const responseText = await userResponse.text()
    let userData
    
    try {
      userData = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse user response:', responseText)
      return NextResponse.json({ error: 'Invalid response from Twitter API' }, { status: 500 })
    }

    if (!userResponse.ok) {
      console.error('User API error:', userData)
      return NextResponse.json({ 
        error: userData.error || 'Failed to fetch user data',
        details: userData
      }, { status: userResponse.status })
    }

    if (!userData.id) {
      console.error('No user ID in response:', userData)
      return NextResponse.json({ error: 'User not foundxx' }, { status: 404 })
    }

    // Then get their followings
    const followingsResponse = await fetch(`https://api.socialapi.me/twitter/friends/list?user_id=${userData.id}&limit=50`, {
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
      console.error('Followings API error:', followingsData)
      return NextResponse.json({ 
        error: followingsData.error || 'Failed to fetch followings',
        details: followingsData
      }, { status: followingsResponse.status })
    }

    return NextResponse.json(followingsData)
  } catch (error: any) {
    console.error('Error fetching Twitter data:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch Twitter data',
      details: error.toString()
    }, { status: 500 })
  }
}
