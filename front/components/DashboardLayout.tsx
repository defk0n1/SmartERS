'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  HomeIcon, 
  UserGroupIcon, 
  TruckIcon, 
  ExclamationTriangleIcon, 
  MapIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface NavItem {
  name: string
  href: string
  icon: any
  roles: string[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon, roles: ['admin'] },
  { name: 'Dashboard', href: '/operator/dashboard', icon: HomeIcon, roles: ['operator'] },
  { name: 'Dashboard', href: '/driver/dashboard', icon: HomeIcon, roles: ['driver'] },
  { name: 'Users', href: '/admin/users', icon: UserGroupIcon, roles: ['admin'] },
  { name: 'Incidents', href: '/admin/incidents', icon: ExclamationTriangleIcon, roles: ['admin'] },
  { name: 'Incidents', href: '/operator/incidents', icon: ExclamationTriangleIcon, roles: ['operator'] },
  { name: 'Ambulances', href: '/admin/ambulances', icon: TruckIcon, roles: ['admin', 'operator'] },
  { name: 'Map', href: '/admin/map', icon: MapIcon, roles: ['admin', 'operator'] },
  { name: 'My Assignments', href: '/driver/assignments', icon: ExclamationTriangleIcon, roles: ['driver'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const filteredNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role) && item.href.startsWith(`/${user.role}`)
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 bg-gray-800">
            <h1 className="text-xl font-bold text-white">SmartERS</h1>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="py-6 px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
