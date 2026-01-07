'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Route, Building2, Users, Calendar, Database } from 'lucide-react'

interface SidebarMenuProps {
  collapsed: boolean
}

const items = [
  {
    key: 'pathfinder',
    label: 'Pathfinder',
    href: '/app',
    icon: Route,
    color: 'text-berri-raspberry',
    bgActive: 'bg-berri-raspberry/10 border-berri-raspberry/20',
  },
  {
    key: 'company-intel',
    label: 'Company Intel',
    href: '/app/manage-org',
    icon: Building2,
    color: 'text-berri-coral',
    bgActive: 'bg-berri-coral/10 border-berri-coral/20',
  },
  {
    key: 'people-intel',
    label: 'People Intel',
    href: '/app/find-from-org',
    icon: Users,
    color: 'text-berri-amber',
    bgActive: 'bg-berri-amber/10 border-berri-amber/20',
  },
  {
    key: 'events',
    label: 'Events',
    href: '/events',
    icon: Calendar,
    color: 'text-gray-400',
    bgActive: 'bg-gray-100',
    disabled: true,
  },
  {
    key: 'daos',
    label: 'DAOs',
    href: '/daos',
    icon: Database,
    color: 'text-gray-400',
    bgActive: 'bg-gray-100',
    disabled: true,
  },
]

export default function SidebarMenu({ collapsed }: SidebarMenuProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/app') {
      return pathname === '/app'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className={`flex flex-col gap-1 w-full ${collapsed ? 'items-center px-2' : ''}`}>
      {items.map((item) => {
        const active = isActive(item.href)
        const disabled = 'disabled' in item && item.disabled
        const Icon = item.icon

        if (disabled) {
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-40 cursor-not-allowed 
                         ${collapsed ? 'justify-center' : ''} w-full`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
              {!collapsed && <span className="truncate text-sm text-gray-400">{item.label}</span>}
            </div>
          )
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 
                       ${collapsed ? 'justify-center' : ''} w-full border
                       ${active
                ? `${item.bgActive} ${item.color}`
                : 'border-transparent hover:bg-gray-50 hover:border-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            title={collapsed ? item.label : undefined}
          >
            <Icon className={`w-5 h-5 ${active ? item.color : ''} transition-colors`} />
            {!collapsed && (
              <span className={`truncate text-sm font-medium ${active ? 'text-gray-900' : ''}`}>
                {item.label}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
