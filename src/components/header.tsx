'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export function Header() {
  const { user } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Intro
            </Link>
            {user && (
              <nav className="ml-8">
                <ul className="flex space-x-4">
                  <li>
                    <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                      Profile
                    </Link>
                  </li>
                </ul>
              </nav>
            )}
          </div>
          <div>
            {user && (
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
