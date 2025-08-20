import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Brain,
  TrendingUp,
  Settings as SettingsIcon,
  Zap,
  Menu,
  X,
  Circle,
} from 'lucide-react'
import { useTradingContext } from '../contexts/TradingContext'

type NavItem = { name: string; href: string; icon: React.ComponentType<any> }

const NAV: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Trading', href: '/trading', icon: Zap },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'AI & Risk', href: '/models', icon: Brain }, // link to Models; have sub-link to /risk within page if you want
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
]

export default function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation()
  const { state } = useTradingContext()

  // theme: prefer saved theme, else OS preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-color-scheme: dark)').matches
      : true
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const [open, setOpen] = useState(false)
  const sysOnline = (state?.systemStatus || 'offline') === 'online'

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <button
            aria-label="Toggle Menu"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 mr-4">
            <img src="/logo.svg" alt="MethTrader" width="24" height="24" />
            <span className="font-semibold tracking-tight">MethTrader</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {NAV.map(({ name, href, icon: Icon }) => {
              const active = location.pathname === href
              return (
                <Link
                  key={href}
                  to={href}
                  className={`px-3 py-2 rounded-md text-sm transition
                    ${active ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon size={16} />
                    {name}
                  </span>
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* System status pill */}
            <span
              title={sysOnline ? 'Online' : 'Offline'}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full
                ${sysOnline ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
            >
              <Circle size={10} />
              {sysOnline ? 'Online' : 'Offline'}
            </span>

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="px-2 py-1 rounded text-xs border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {darkMode ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {open && (
          <div className="lg:hidden border-t border-black/5 dark:border-white/10">
            <nav className="px-3 py-2 space-y-1">
              {NAV.map(({ name, href, icon: Icon }) => {
                const active = location.pathname === href
                return (
                  <Link
                    key={href}
                    to={href}
                    onClick={() => setOpen(false)}
                    className={`block px-3 py-2 rounded-md text-sm transition
                      ${active ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={16} />
                      {name}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}