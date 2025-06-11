import { UserButton } from '@clerk/nextjs'
import SidebarMenu from './SidebarMenu'

// Sidebar for navigation and user info
interface SidebarProps {
  user: any
  profile: any
  twitterUsername: string | null
  collapsed: boolean
  setCollapsed: (c: boolean | ((c: boolean) => boolean)) => void
}

export default function Sidebar({ user, profile, twitterUsername, collapsed, setCollapsed }: SidebarProps) {

  return (
    <div className={`flex flex-col justify-between h-screen border-r border-gray-700 sticky top-0 left-0 transition-all duration-300 ${collapsed ? 'w-20' : 'w-[280px]'} bg-[#181818]`} style={{ maxWidth: collapsed ? 80 : 320, minWidth: collapsed ? 80 : 280 }}>
      {/* Top Bar */}
      <div className="h-16 flex items-center px-4 border-b border-gray-700 justify-between">
        <span className="text-2xl font-bold text-white">intro</span>
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c: boolean) => !c)}
          className="ml-2 p-2 rounded hover:bg-gray-800 transition-colors"
        >
          {collapsed ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>
      {/* Sidebar Content */}
      <div className={`flex-1 flex flex-col ${collapsed ? 'items-center px-0 py-4' : 'px-8 py-6'}`}> 
        <div className={`mb-8 w-full ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {!collapsed && (
            <>
              <p className="text-xl text-white mb-1">Welcome {user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}</p>
              {twitterUsername && (
                <p className="text-gray-400 flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-[#1DA1F2]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  @{twitterUsername}
                </p>
              )}
              <p className="text-gray-400 text-sm whitespace-pre-line">{profile?.bio || ''}</p>
            </>
          )}
        </div>
        <SidebarMenu collapsed={collapsed} />
        
        <div className="flex-1" />
        <div className={`mt-8 flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <UserButton afterSignOutUrl="/" />
          {!collapsed && <span className="ml-2 text-white text-sm">Profile</span>}
        </div>
      </div>
      <div className={`px-8 py-4 border-t border-gray-700 ${collapsed ? 'px-0 flex justify-center' : ''}`}>
        {!collapsed && <p className="text-gray-400 text-xs">Terms | Privacy policy</p>}
      </div>
    </div>
  )
}
