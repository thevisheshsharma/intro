'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { LoginForm } from '@/components/auth/login-form'
import { getProfile } from '@/lib/profile'
import type { Profile } from '@/lib/profile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'

export default function Home() {
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
      const twitterAccount = user.externalAccounts?.find(
        account => account.provider === 'twitter' || account.provider === 'x'
      )
      if (twitterAccount?.username) {
        setTwitterUsername(twitterAccount.username)
      }
    }
  }, [isLoaded, user])

  async function loadProfile() {
    if (!user) return
    try {
      setLoading(true)
      setError(null)
      const data = await getProfile(user.id)
      setProfile(data)
    } catch (error: any) {
      setError(error.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || (user && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <ErrorDisplay message={error} />
  }

  return (
    
    <div className="flex min-h-screen w-full" style={{ backgroundColor:"#1f1f23"}}>
      {/* Left Sidebar */}
      {user && (
        <div className="flex flex-col justify-between h-screen border-r border-gray-700">
          {/* Top Bar */}
          <div className="h-16 flex items-center px-8 border-b border-gray-700">
            <span className="text-2xl font-bold text-white">intro</span>
          </div>
          {/* Sidebar Content */}
          <div className="flex-1 flex flex-col px-8 py-6">
            <div className="mb-8">
              <p className="text-xl font-bold text-white mb-1">Welcome {user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}</p>
              {twitterUsername && (
                <p className="text-gray-400 flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-[#1DA1F2]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  @{twitterUsername}
                </p>
              )}
              <p className="text-gray-400 text-sm whitespace-pre-line">
                {profile?.bio || 'fetched bio from the twitter account'}
              </p>
            </div>
            
            <nav className="flex flex-col gap-2 text-white">
              <a href="#" className="bg-gray-800 p-2 rounded-lg transition-colors">Twitter</a>
              <a href="#" className="hover:bg-gray-800 p-2 rounded-lg transition-colors">Events</a>
              <a href="#" className="hover:bg-gray-800 p-2 rounded-lg transition-colors">Organisation</a>
              <a href="#" className="hover:bg-gray-800 p-2 rounded-lg transition-colors">DAOs</a>
              
            </nav>
            <div className="flex-1" />
            <a href="#" className="text-white text-sm mt-8">Profile</a>
          </div>
          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-700">
            <p className="text-gray-400 text-xs">Terms | Privacy policy</p>
          </div>
        </div>
      )}
      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Connect with your next prospect</h2>
          <p className="text-gray-300 mb-8 text-center">Leverage your network, connect with anyone<br />with their twitter username</p>
          <form className="w-full flex flex-col items-center">
            <div className="flex w-full mb-4">
              <input
                type="text"
                placeholder="Type @username"
                 style={{ backgroundColor:"#1f1f23"}}
                className="flex-1 rounded-l-lg px-4 py-3 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              <button type="submit" className="rounded-r-lg px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  )
}
