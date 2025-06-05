'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserButton, SignInButton, useUser } from '@clerk/nextjs'

export function Header() {
  const { user, isSignedIn } = useUser()

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
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <Button>Sign in</Button>
              </SignInButton>
            ) : (
              <UserButton afterSignOutUrl="/" appearance={{
                elements: {
                  userButtonPopoverFooter: {
                    onClick: () => {
                      window.location.href = '/';
                      window.location.reload();
                    }
                  }
                }
              }} />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
