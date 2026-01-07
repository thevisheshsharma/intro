import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TwitterUser {
  id: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  description: string;
  followers_count: number;
  friends_count?: number;
  verified?: boolean;
  account_type?: 'organization' | 'individual';
  verification_info?: {
    type?: string;
    reason?: string;
  };
}

interface FollowingsTableProps {
  followings: TwitterUser[];
  loading: boolean;
  compact?: boolean;
}

export function FollowingsTable({ followings, loading }: FollowingsTableProps) {
  const [page, setPage] = useState(1)
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'az' | 'za' | 'followingsHigh' | 'followingsLow'>('az')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pageSize = 8

  let filtered = showVerifiedOnly ? followings.filter(u => u.verified) : followings
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.screen_name.toLowerCase().includes(q) ||
      (u.description?.toLowerCase().includes(q))
    )
  }
  if (sortBy === 'az') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  else if (sortBy === 'za') filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name))
  else if (sortBy === 'followingsHigh') filtered = [...filtered].sort((a, b) => (b.friends_count || 0) - (a.friends_count || 0))
  else if (sortBy === 'followingsLow') filtered = [...filtered].sort((a, b) => (a.friends_count || 0) - (b.friends_count || 0))

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  if (loading) {
    return (
      <div className="w-full mt-8 flex items-center justify-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-berri-raspberry/20 border-t-berri-raspberry animate-spin" />
        <span className="text-gray-500">Loading followings...</span>
      </div>
    )
  }

  if (!followings?.length) return null

  return (
    <div className="w-full flex flex-col gap-3 group">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-end w-full min-h-[36px]">
        {/* Search */}
        <div className="relative flex items-center h-9" style={{ minWidth: 0, width: searchOpen ? 220 : 36, transition: 'width 0.3s' }}>
          <button
            type="button"
            className={cn('transition-all duration-300', (!searchOpen && 'opacity-0 group-hover:opacity-100') || (searchOpen && 'opacity-0 pointer-events-none'),
              'bg-transparent border-none p-0 m-0', searchOpen ? 'text-berri-raspberry' : 'text-gray-400', 'hover:text-berri-raspberry focus:outline-none absolute left-0')}
            style={{ height: 36, width: 36 }}
            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 150) }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <input
            ref={searchInputRef}
            type="text"
            className={cn('absolute text-sm left-0 top-0 h-9 text-gray-900 bg-white transition-all duration-300',
              'border border-gray-200 rounded-xl px-3 focus:border-berri-raspberry focus:ring-2 focus:ring-berri-raspberry/10',
              searchOpen ? 'w-56 opacity-100' : 'w-0 opacity-0 pointer-events-none')}
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            onBlur={() => setSearchOpen(false)}
            onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }}
          />
        </div>

        {/* Verified Toggle */}
        <button
          type="button"
          className={cn('transition', showVerifiedOnly ? '' : 'opacity-0 group-hover:opacity-100',
            'bg-transparent border-none p-0 m-0', showVerifiedOnly ? 'text-berri-raspberry' : 'text-gray-400', 'hover:text-berri-raspberry focus:outline-none')}
          style={{ height: 36, width: 36 }}
          onClick={() => { setShowVerifiedOnly(v => !v); setPage(1) }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
          </svg>
        </button>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            type="button"
            className={cn('transition opacity-0 group-hover:opacity-100', 'bg-transparent border-none p-0 m-0',
              sortDropdownOpen ? 'text-berri-raspberry' : 'text-gray-400', 'hover:text-berri-raspberry focus:outline-none')}
            style={{ height: 36, width: 36 }}
            onClick={() => setSortDropdownOpen(v => !v)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h12M3 17h6" />
            </svg>
          </button>
          {sortDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
              {[
                { key: 'az', label: 'Alphabetical (A → Z)' },
                { key: 'za', label: 'Alphabetical (Z → A)' },
                { key: 'followingsHigh', label: 'Followings (High → Low)' },
                { key: 'followingsLow', label: 'Followings (Low → High)' }
              ].map(opt => (
                <button
                  key={opt.key}
                  className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                    sortBy === opt.key ? 'bg-berri-raspberry/10 text-berri-raspberry font-medium' : 'text-gray-700 hover:bg-gray-50')}
                  onClick={() => { setSortBy(opt.key as typeof sortBy); setSortDropdownOpen(false) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider border-b border-gray-100">
          <div className="col-span-8">User</div>
          <div className="col-span-4 text-right">Followings / Followers</div>
        </div>

        {/* Rows */}
        {paginated.map((user) => (
          <div key={user.id} className="flex md:grid md:grid-cols-12 gap-2 px-5 py-4 hover:bg-gray-50/50 transition border-t border-gray-100 first:border-t-0 items-center">
            <div className="flex items-center gap-3 col-span-8 min-w-0">
              <img src={user.profile_image_url_https} alt={user.name} className="w-10 h-10 rounded-full border border-gray-100 shadow-sm flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                    {user.name}
                    {user.verified && (
                      <svg className="w-4 h-4 text-berri-raspberry flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                      </svg>
                    )}
                    {user.account_type === 'organization' && (
                      <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-lg font-medium">ORG</span>
                    )}
                  </span>
                  <span className="text-gray-500 text-sm truncate">@{user.screen_name}</span>
                </div>
                <span className="text-gray-600 text-sm mt-0.5 truncate" title={user.description}>{user.description}</span>
              </div>
            </div>
            <div className="hidden md:flex col-span-4 items-center justify-end gap-1">
              <span className="text-berri-raspberry font-semibold">{user.friends_count !== undefined ? user.friends_count.toLocaleString() : '-'}</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">{user.followers_count.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end min-w-[70px] md:hidden ml-auto">
              <span className="text-berri-raspberry text-xs">{user.friends_count !== undefined ? user.friends_count.toLocaleString() : '-'}</span>
              <span className="text-gray-500 text-xs">{user.followers_count.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-2">
          <button
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-200 transition-colors"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
          <button
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-200 transition-colors"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
