'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePrivy } from '@privy-io/react-auth'

export function Header() {
  const { authenticated, login } = usePrivy()

  // Hide header if user is signed in (profile management is now in sidebar)
  if (authenticated) return null;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Intro
            </Link>
          </div>
          <div>
            <Button onClick={() => login()}>Sign in</Button>
          </div>
        </div>
      </div>
    </header>
  )
}
