import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'

export function LoginForm() {
  // Get the current URL
  const redirectTo = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback`
    : `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`

  return (
    <div className="w-full max-w-[400px] mx-auto p-6">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        theme="light"
        providers={['github', 'google', 'twitter']}
        redirectTo={redirectTo}
        queryParams={{
          access_type: 'offline',
          prompt: 'consent',
        }}
      />
    </div>
  )
}
