'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface PrivyUserButtonProps {
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function PrivyUserButton({ showName = false, size = 'md' }: PrivyUserButtonProps) {
  const { user, logout } = usePrivy()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get display info from linked accounts
  const twitterAccount = user?.linkedAccounts?.find(
    (account: any) => account.type === 'twitter_oauth'
  )
  const emailAccount = user?.linkedAccounts?.find(
    (account: any) => account.type === 'email'
  )
  const walletAccount = user?.linkedAccounts?.find(
    (account: any) => account.type === 'wallet'
  )

  const displayName = (twitterAccount as any)?.username ||
    (emailAccount as any)?.address?.split('@')[0] ||
    ((walletAccount as any)?.address ? `${(walletAccount as any).address.slice(0, 6)}...${(walletAccount as any).address.slice(-4)}` : 'User')

  // Get profile picture from Twitter OAuth (Privy provides pictureUrl)
  const profilePicture = (twitterAccount as any)?.pictureUrl || null
  const avatarLetter = displayName[0]?.toUpperCase() || 'U'

  // Size classes for button
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  }

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} rounded-full overflow-hidden
                   flex items-center justify-center
                   ring-2 ring-white/50 hover:ring-berri-raspberry/50 transition-all duration-200
                   hover:scale-105 active:scale-95
                   ${!profilePicture ? 'bg-gradient-to-br from-berri-raspberry to-berri-coral text-white font-semibold' : ''}`}
      >
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          avatarLetter
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 bottom-full mb-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              {twitterAccount && (
                <p className="text-xs text-gray-500">@{(twitterAccount as any).username}</p>
              )}
              {emailAccount && (
                <p className="text-xs text-gray-500 truncate">{(emailAccount as any).address}</p>
              )}
              {walletAccount && !twitterAccount && !emailAccount && (
                <p className="text-xs text-gray-500 truncate">
                  {(walletAccount as any).address.slice(0, 10)}...{(walletAccount as any).address.slice(-8)}
                </p>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/app/settings/billing"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                Settings & Billing
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-gray-400" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
