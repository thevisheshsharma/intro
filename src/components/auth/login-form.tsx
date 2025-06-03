import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase, getSiteUrl } from '@/lib/supabase'

export function LoginForm() {
  const siteUrl = getSiteUrl()
  
  return (
    <div className="w-full max-w-[400px] mx-auto p-6">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        theme="light"
        providers={['github', 'google', 'twitter']}
        redirectTo={`${siteUrl}/auth/callback`}
      />
    </div>
  )
}
