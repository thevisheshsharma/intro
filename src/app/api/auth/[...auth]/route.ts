import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { event, session } = await request.json()

  if (event === 'SIGNED_IN') {
    await supabase.auth.setSession(session)
  }

  return NextResponse.json({ message: 'Session synced' })
}
