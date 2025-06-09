import { useState } from 'react'

interface TwitterUser {
  id: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  description: string;
  followers_count: number;
}

interface FollowingsTableProps {
  followings: TwitterUser[];
  loading: boolean;
  compact?: boolean;
}

export function FollowingsTable({ followings, loading, compact = false }: FollowingsTableProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(followings.length / pageSize)
  const paginated = followings.slice((page - 1) * pageSize, page * pageSize)

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
    <div className="w-full  flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        {paginated.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-4 bg-[#23272f] rounded-lg shadow-sm px-4 py-3 hover:bg-[#2c313a] transition w-full max-w-full"
            style={{ minWidth: 0 }}
          >
            <img
              src={user.profile_image_url_https}
              alt={user.name}
              className="w-12 h-12 rounded-full border border-gray-700 shadow flex-shrink-0"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-base truncate">{user.name}</span>
                <span className="text-gray-400 text-sm truncate">@{user.screen_name}</span>
              </div>
              <span className="text-gray-300 text-sm mt-1 truncate max-w-full" title={user.description}>{user.description}</span>
            </div>
            <div className="flex flex-col items-end min-w-[70px]">
              <span className="text-gray-400 text-xs">Followers</span>
              <span className="text-white text-base font-semibold">{user.followers_count.toLocaleString()}</span>
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
  )
}
