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
}

export function FollowingsTable({ followings, loading }: FollowingsTableProps) {
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
    <div className="w-full mt-8 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-700">
            <th className="p-4 text-gray-400 font-medium">Profile</th>
            <th className="p-4 text-gray-400 font-medium">Bio</th>
            <th className="p-4 text-gray-400 font-medium">Followers</th>
          </tr>
        </thead>
        <tbody>
          {followings.map((user) => (
            <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-800/50">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={user.profile_image_url_https}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-white">{user.name}</div>
                    <div className="text-gray-400">@{user.screen_name}</div>
                  </div>
                </div>
              </td>
              <td className="p-4 text-gray-300">
                <div className="max-w-md truncate">{user.description}</div>
              </td>
              <td className="p-4 text-gray-300">
                {user.followers_count.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
