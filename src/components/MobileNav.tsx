import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, TrendingUp, Bitcoin, Bot, Settings } from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Trading', href: '/trading', icon: TrendingUp },
  { name: 'Crypto', href: '/crypto', icon: Bitcoin },
  { name: 'Models', href: '/models', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings }
]

export default function MobileNav() {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-gray-800 lg:hidden">
      <ul className="grid grid-cols-5">
        {navItems.map(item => {
          const isActive = currentPath === item.href
          const Icon = item.icon
          return (
            <li key={item.name}>
              <Link
                to={item.href}
                className={`flex flex-col items-center justify-center py-2.5 gap-1 text-xs transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="truncate max-w-[5.5rem]">{item.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}