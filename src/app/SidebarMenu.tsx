// Sidebar menu navigation items

interface SidebarMenuProps {
  collapsed: boolean
  selectedPanel: 'twitter' | 'manage-org'
  setSelectedPanel: (panel: 'twitter' | 'manage-org') => void
}

const items = [
  {
    key: 'twitter',
    label: 'Twitter',
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22.46 6c-.77.35-1.6.59-2.47.7a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04A4.28 4.28 0 0 0 16.11 4c-2.37 0-4.29 1.92-4.29 4.29 0 .34.04.67.11.99C7.69 9.13 4.07 7.38 1.64 4.7c-.37.64-.58 1.38-.58 2.17 0 1.5.76 2.82 1.92 3.6-.71-.02-1.38-.22-1.97-.54v.05c0 2.1 1.5 3.85 3.5 4.25-.36.1-.74.16-1.13.16-.28 0-.54-.03-.8-.08.54 1.7 2.1 2.94 3.95 2.97A8.6 8.6 0 0 1 2 19.54c-.65 0-1.28-.04-1.9-.11A12.13 12.13 0 0 0 7.29 21.5c7.55 0 11.68-6.26 11.68-11.68 0-.18-.01-.36-.02-.54A8.18 8.18 0 0 0 22.46 6z" /></svg>
    ),
    active: true
  },
  {
    key: 'manage-org',
    label: 'Manage Org',
    icon: (
      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    ),
    href: '/manage-org'
  },
  {
    key: 'events',
    label: 'Events',
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>
    ),
  },
  {
    key: 'organisation',
    label: 'Organisation',
    icon: (
      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m9-4V7a4 4 0 1 0-8 0v2m12 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
    ),
  },
  {
    key: 'daos',
    label: 'DAOs',
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h4v4m0-4V8" /></svg>
    ),
  },
]

// Sidebar menu navigation
export default function SidebarMenu({ collapsed, selectedPanel, setSelectedPanel }: SidebarMenuProps) {
  const handleClick = (item: typeof items[0]) => {
    if (item.key === 'twitter' || item.key === 'manage-org') {
      setSelectedPanel(item.key as 'twitter' | 'manage-org')
    }
  }

  return (
    <nav className={`flex flex-col gap-2 text-white w-full ${collapsed ? 'items-center' : ''}`}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => handleClick(item)}
          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''} ${
            selectedPanel === item.key ? 'bg-[#343434]' : 'hover:bg-gray-800'
          } w-full text-left`}
          style={{ minHeight: 44, background: selectedPanel === item.key ? '#343434' : 'none' }}
        >
          {item.icon}
          {!collapsed && <span className="truncate">{item.label}</span>}
        </button>
      ))}
    </nav>
  )
}
