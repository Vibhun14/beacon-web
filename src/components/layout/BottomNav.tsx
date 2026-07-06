import { NavLink } from 'react-router-dom'
import { LayoutDashboard, School, FileText, User, CalendarDays } from 'lucide-react'
import { clsx } from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/schools', icon: School, label: 'Schools' },
  { to: '/essays', icon: FileText, label: 'Essays' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-10 flex">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors',
              isActive ? 'text-beacon' : 'text-muted'
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
