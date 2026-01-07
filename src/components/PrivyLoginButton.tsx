'use client'

import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface PrivyLoginButtonProps {
  variant?: 'brand' | 'brandOutline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function PrivyLoginButton({
  variant = 'brand',
  size = 'default',
  className = '',
  children
}: PrivyLoginButtonProps) {
  const { login, ready, authenticated } = usePrivy()

  // Show loading while Privy initializes
  if (!ready) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    )
  }

  // If authenticated, show dashboard link
  if (authenticated) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`rounded-full ${className}`}
        asChild
      >
        <Link href="/app" className="flex items-center gap-2">
          Go to Dashboard
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </Button>
    )
  }

  // Not authenticated - show login button
  return (
    <Button
      variant={variant}
      size={size}
      className={`rounded-full ${className}`}
      onClick={() => login()}
    >
      {children || 'Get Started'}
    </Button>
  )
}

// Simple text link version for "Log in"
export function PrivyLoginLink({ className = '' }: { className?: string }) {
  const { login, ready } = usePrivy()

  if (!ready) return null

  return (
    <button
      onClick={() => login()}
      className={`px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900
                 transition-colors duration-300 rounded-full hover:bg-gray-100 ${className}`}
    >
      Log in
    </button>
  )
}
