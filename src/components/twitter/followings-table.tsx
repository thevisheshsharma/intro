import { useState, useRef } from 'react'
import clsx from 'clsx'

interface TwitterUser {
  id: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  description: string;
  followers_count: number;
  friends_count?: number;
  verified?: boolean;
}

interface FollowingsTableProps {
  followings: TwitterUser[];
  loading: boolean;
  compact?: boolean;
}

export function FollowingsTable({ followings, loading, compact = false }: FollowingsTableProps) {
  const [page, setPage] = useState(1)
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'az' | 'za' | 'followingsHigh' | 'followingsLow'>('az')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pageSize = 8

  // Filter for verified
  let filtered = showVerifiedOnly ? followings.filter(u => u.verified) : followings
  // Search
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.screen_name.toLowerCase().includes(q) ||
      (u.description?.toLowerCase().includes(q))
    )
  }
  // Sort
  if (sortBy === 'az') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy === 'za') {
    filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name))
  } else if (sortBy === 'followingsHigh') {
    filtered = [...filtered].sort((a, b) => (b.friends_count || 0) - (a.friends_count || 0))
  } else if (sortBy === 'followingsLow') {
    filtered = [...filtered].sort((a, b) => (a.friends_count || 0) - (b.friends_count || 0))
  }

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Pills UI helpers
  const pillClass = (active: boolean, color: string) =>
    clsx(
      'px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition border',
      active ? `bg-${color}-600 text-white border-${color}-700` : 'bg-gray-800 text-gray-300 border-gray-700',
      'hover:bg-opacity-80',
    )

  if (loading) {
    return (
      <div className="w-full mt-8 text-center text-gray-400">
        Loading followings...
      </div>
    )
  }

  if (!followings?.length) {
    return null
  }

  return (
    <div className="w-full flex flex-col gap-2 group">
      {/* Filters right aligned, icons only on hover */}
      <div className="flex flex-wrap gap-2 mb-0 items-center justify-end w-full min-h-[32px]">
        {/* Search Icon/Button with improved animation and no overlap */}
        <div className="relative flex items-center h-8" style={{ minWidth: 0, width: searchOpen ? 210 : 32, transition: 'width 0.3s' }}>
          <button
            type="button"
            className={clsx(
              'transition-all duration-300',
              (!searchOpen && 'opacity-0 group-hover:opacity-100') || (searchOpen && 'opacity-0 pointer-events-none'),
              'bg-transparent border-none p-0 m-0',
              searchOpen ? 'text-blue-500' : 'text-gray-400',
              'hover:text-blue-400',
              'focus:outline-none',
              'absolute left-0',
            )}
            style={{ fontSize: '10px', height: 32, width: 32, minWidth: 32, minHeight: 32, zIndex: 2 }}
            onClick={() => {
              setSearchOpen(true)
              setTimeout(() => searchInputRef.current?.focus(), 150)
            }}
            aria-label="Open search filter"
            tabIndex={searchOpen ? -1 : 0}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <input
            ref={searchInputRef}
            type="text"
            className={clsx(
              'absolute text-xs left-0 top-0 h-8 text-white bg-transparent text-base transition-all duration-300',
              'border-b-2 border-blue-500', 'placeholder:text-xs',
              '!outline-none !ring-0 focus:!outline-none focus:!ring-0',
              searchOpen ? 'w-56 opacity-100 pl-2' : 'w-0 opacity-0 pl-0 pointer-events-none',
            )}
            placeholder="search by name, username, or bio"
            autoComplete="on"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ minWidth: searchOpen ? 180 : 0, maxWidth: 210, borderRadius: 0, background: 'transparent', boxShadow: 'none', outline: 'none'}}
            onBlur={() => setSearchOpen(false)}
            onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }}
            tabIndex={searchOpen ? 0 : -1}
            autoFocus={searchOpen}
            aria-label="Search by name, username, or bio"
          />
        </div>
        {/* Verified Icon Toggle - smaller */}
        <button
          type="button"
          className={clsx(
            'transition',
            (showVerifiedOnly ? '' : 'opacity-0 group-hover:opacity-100'),
            'bg-transparent border-none p-0 m-0',
            showVerifiedOnly ? 'text-blue-500' : 'text-gray-400',
            'hover:text-blue-400',
            'focus:outline-none'
          )}
          style={{ fontSize: '10px', height: 32, width: 32, minWidth: 32, minHeight: 32 }}
          onClick={() => { setShowVerifiedOnly(v => !v); setPage(1); }}
          aria-label="Toggle verified filter"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <g>
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
            </g>
          </svg>
        </button>
        {/* Sort Icon Dropdown - smaller */}
        <div className="relative">
          <button
            type="button"
            className={clsx(
              'transition',
              'opacity-0 group-hover:opacity-100',
              'bg-transparent border-none p-0 m-0',
              sortDropdownOpen ? 'text-blue-500' : 'text-gray-400',
              'hover:text-blue-400',
              'focus:outline-none'
            )}
            style={{ fontSize: '12px', height: 32, width: 32, minWidth: 32, minHeight: 32 }}
            onClick={() => setSortDropdownOpen(v => !v)}
            aria-label="Open sorting options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 18h6M3 6h18M3 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {sortDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-[#23272f] border border-gray-700 rounded-lg shadow-lg z-10">
              <button
                className={clsx('w-full text-left px-4 py-2 hover:bg-gray-700 rounded-t-lg text-xs', sortBy === 'az' ? 'bg-blue-600 text-white' : 'text-gray-200')}
                onClick={() => { setSortBy('az'); setSortDropdownOpen(false) }}
                aria-label="Sort Alphabetical (A to Z)"
              >
                Alphabetical (A → Z)
              </button>
              <button
                className={clsx('w-full text-left px-4 py-2 hover:bg-gray-700 text-xs', sortBy === 'za' ? 'bg-blue-600 text-white' : 'text-gray-200')}
                onClick={() => { setSortBy('za'); setSortDropdownOpen(false) }}
                aria-label="Sort Alphabetical (Z to A)"
              >
                Alphabetical (Z → A)
              </button>
              <button
                className={clsx('w-full text-left px-4 py-2 hover:bg-gray-700 text-xs', sortBy === 'followingsHigh' ? 'bg-blue-600 text-white' : 'text-gray-200')}
                onClick={() => { setSortBy('followingsHigh'); setSortDropdownOpen(false) }}
                aria-label="Sort Followings High to Low"
              >
                Followings (High → Low)
              </button>
              <button
                className={clsx('w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg text-xs', sortBy === 'followingsLow' ? 'bg-blue-600 text-white' : 'text-gray-200')}
                onClick={() => { setSortBy('followingsLow'); setSortDropdownOpen(false) }}
                aria-label="Sort Followings Low to High"
              >
                Followings (Low → High)
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Table Outline Container */}
      <div className="w-full border border-gray-700 rounded-xl shadow-lg p-0">
        <div className="flex flex-col gap-2">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-2 py-2 text-gray-400 text-xs font-semibold border-b border-gray-700 rounded-t-lg w-full">
            <div className="col-span-8"></div>
            <div className="col-span-4 text-right">Followings<span className="text-xs text-gray-500"> / </span>Followers</div>
          </div>
          {paginated.map((user) => (
            <div
              key={user.id}
              className="flex md:grid md:grid-cols-12 gap-2 bg-[#23272f] rounded-lg shadow-sm px-2 py-3 hover:bg-[#2c313a] transition w-full items-center"
              style={{ minWidth: 0 }}
            >
              {/* User Info */}
              <div className="flex items-center gap-3 col-span-8 min-w-0">
                <img
                  src={user.profile_image_url_https}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border border-gray-700 shadow flex-shrink-0"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-white text-base truncate flex items-center gap-1">
                      {user.name}
                      {user.verified && (
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                          <g>
                            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                          </g>
                        </svg>
                      )}
                    </span>
                    <span className="text-gray-400 text-sm truncate">@{user.screen_name}</span>
                  </div>
                  <span className="text-gray-300 text-sm mt-1 truncate max-w-full" title={user.description}>{user.description}</span>
                </div>
              </div>
              {/* Followings/Followers merged column, no label */}
              <div className="hidden md:block col-span-4 text-right">
                <span className="text-blue-400 text-base font-semibold">{user.friends_count !== undefined ? user.friends_count.toLocaleString() : '-'}</span>
                <span className="text-xs text-gray-500"> / </span>
                <span className="text-orange-400 text-base">{user.followers_count.toLocaleString()}</span>
              </div>
              {/* Mobile layout for stats, no label */}
              <div className="flex flex-col items-end min-w-[70px] md:hidden ml-auto">
                <span className="text-blue-400 text-xs">{user.friends_count !== undefined ? user.friends_count.toLocaleString() : '-'}</span>
                <span className="text-orange-400 text-xs mt-1">{user.followers_count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-2">
            <button
              className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-gray-300">Page {page} of {totalPages}</span>
            <button
              className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
