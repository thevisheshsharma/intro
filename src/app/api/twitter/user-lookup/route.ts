import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const screen_name = searchParams.get('screen_name')?.replace('@', '')

  if (!screen_name) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://api.socialapi.me/twitter/user/${screen_name}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json',
        },
      }
    )
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
