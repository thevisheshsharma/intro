import React from 'react';

interface TwitterProfileCardProps {
  user: {
    name: string;
    screen_name: string;
    profile_image_url_https: string;
    description: string;
    followers_count: number;
    friends_count?: number;
    location?: string;
    url?: string;
    verified?: boolean;
  };
}

export const TwitterProfileCard: React.FC<TwitterProfileCardProps> = ({ user }) => {
  return (
    <div className="bg-[#181818] border border-gray-700 rounded-xl p-4 flex flex-col items-start w-full shadow-lg" style={{ minWidth: 0 }}>
      <div className="flex items-center gap-3 mb-2">
        <img
          src={user.profile_image_url_https}
          alt={user.name}
          className="w-12 h-12 rounded-full border-2 border-gray-700 shadow"
        />
        <div className="text-lg font-semibold text-white flex items-center gap-1">
          {user.name}
          {user.verified && (
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
              <g>
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
              </g>
            </svg>
          )}
        </div>
      </div>
      {user.location && <div className="text-gray-500 text-xs mb-1">{user.location}</div>}
      <div className="text-gray-300 text-sm mb-2 line-clamp-3">{user.description}</div>
      <div className="flex gap-4 text-xs text-gray-400">
        <div>
          <span className="font-bold text-white">{user.followers_count.toLocaleString()}</span> Followers
        </div>
        {user.friends_count !== undefined && (
          <div>
            <span className="font-bold text-white">{user.friends_count.toLocaleString()}</span> Following
          </div>
        )}
      </div>
      {user.url && (
        <a
          href={user.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-blue-400 text-xs hover:underline"
        >
          {user.url}
        </a>
      )}
    </div>
  );
};
