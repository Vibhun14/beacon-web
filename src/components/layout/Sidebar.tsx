import { NavLink } from 'react-router-dom'
import { LayoutDashboard, School, FileText, Mail, Settings, LogOut, Moon, Sun } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schools', icon: School, label: 'Schools' },
  { to: '/essays', icon: FileText, label: 'Essays' },
  { to: '/lors', icon: Mail, label: 'Recommendations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-surface border-r border-border flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full bg-beacon opacity-20 animate-beacon" />
          <div className="absolute inset-1 rounded-full bg-beacon" />
        </div>
        <span className="font-display text-xl text-light tracking-tight">Beacon</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive ? 'bg-beacon-dim text-beacon' : 'text-muted hover:text-light hover:bg-border'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom area */}
      <div className="px-3 py-4 border-t border-border">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted hover:text-light hover:bg-border transition-all duration-150 mb-1"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-beacon-dim flex items-center justify-center text-xs font-semibold text-beacon">
              {user?.displayName?.[0] ?? user?.email?.[0] ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-light truncate">{user?.displayName ?? 'Student'}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted hover:text-danger hover:bg-danger/10 transition-all duration-150"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
