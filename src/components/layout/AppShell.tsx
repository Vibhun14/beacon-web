import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-light font-sans">
      <Sidebar />
      <main className="md:ml-56 min-h-screen p-4 md:p-8 pb-20 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
