'use client'

import { memo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { Route, Building2, Users, ChevronLeft, ChevronRight } from 'lucide-react'

interface SidebarProps {
  user: any
  profile: any
  twitterUsername: string | null
  collapsed: boolean
  setCollapsed: (c: boolean | ((c: boolean) => boolean)) => void
}

const navItems = [
  { key: 'pathfinder', href: '/app', icon: Route, label: 'Pathfinder' },
  { key: 'company', href: '/app/manage-org', icon: Building2, label: 'Company Intel' },
  { key: 'people', href: '/app/find-from-org', icon: Users, label: 'People Intel' },
]

const Sidebar = memo(function Sidebar({ user, collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User'

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  // Sidebar widths
  const COLLAPSED_WIDTH = 72
  const EXPANDED_WIDTH = 260

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-3 top-3 bottom-3 z-50 bg-white rounded-2xl shadow-xl shadow-gray-200/50
                 flex flex-col"
    >
      {/* Header - Pixel Perfect Stable Logo */}
      <div className="h-16 flex items-center border-b border-gray-100 flex-shrink-0">
        <div className="w-[72px] min-w-[72px] h-full flex items-center justify-center flex-shrink-0">
          <Link href="/app">
            <div className={`rounded-lg bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center transition-all duration-300 ${collapsed ? 'w-9 h-9' : 'w-8 h-8'}`}>
              <span className="text-white font-bold text-sm">b</span>
            </div>
          </Link>
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-0"
            >
              <span className="font-heading font-bold text-lg text-gray-900 whitespace-nowrap">berri</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Toggle Button */}
      <motion.button
        animate={{ x: 0 }}
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 bottom-20 w-6 h-6 rounded-full bg-white border border-gray-100 
                   flex items-center justify-center text-gray-400 hover:text-gray-600 
                   shadow-md z-[60] transition-transform hover:scale-110"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </motion.button>

      {/* Navigation - Perfectly Stable Icon Column */}
      <nav className="flex-1 py-4 relative z-10">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center transition-all duration-200 relative group h-11
                  ${active
                    ? 'text-berri-raspberry'
                    : 'text-gray-500 hover:text-gray-900'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                {/* Active Highlight Overlay */}
                {active && (
                  <motion.div
                    layoutId="activeNavHighlight"
                    className="absolute inset-y-0 left-2 right-2 bg-berri-raspberry/8 rounded-xl z-[-1]"
                  />
                )}

                {/* ICON ZONE: Exactly 72px wide to center icons perfectly at X=36 */}
                <div className="w-[72px] min-w-[72px] h-full flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${active ? 'text-berri-raspberry' : 'group-hover:text-gray-700'} transition-colors`} />
                </div>

                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      transition={{ duration: 0.2 }}
                      className={`text-sm whitespace-nowrap overflow-hidden ${active ? 'font-medium' : ''}`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium 
                                   whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer - Consistent Alignment */}
      <div className="border-t border-gray-100 p-4 flex-shrink-0">
        <div className="flex items-center">
          <div className="w-[40px] h-10 flex items-center justify-center flex-shrink-0">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0 ml-3"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400">Free plan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
})

export default Sidebar
