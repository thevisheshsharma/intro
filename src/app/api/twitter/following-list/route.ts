import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')
  const cursor = searchParams.get('cursor')

  if (!user_id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
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
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
