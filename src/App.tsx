import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ProfileProvider, useProfile } from '@/context/ProfileContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SchoolsPage } from '@/pages/SchoolsPage'
import { EssaysPage } from '@/pages/EssaysPage'
import { LORsPage } from '@/pages/LORsPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ComparePage } from '@/pages/ComparePage'
import { Spinner } from '@/components/ui'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { profile, profileLoading, profileReady, profileError, refreshProfile } = useProfile()

  if (loading || profileLoading) return (
    <div className="min-h-screen bg-ink flex items-center justify-center"><Spinner /></div>
  )
  if (!user) return <Navigate to="/auth" replace />

  // Fetch failed (e.g. Firestore rules not deployed) — show retry instead of
  // bouncing to onboarding on every refresh.
  if (profileError) return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted">Couldn't load your profile.</p>
      <button
        onClick={refreshProfile}
        className="text-sm text-beacon underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  )

  // Only redirect to onboarding once we've confirmed (profileReady) there's no profile.
  if (profileReady && !profile) return <Navigate to="/onboarding" replace />

  return <AppShell>{children}</AppShell>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-ink flex items-center justify-center"><Spinner /></div>
  )

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/auth" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/schools" element={<ProtectedRoute><SchoolsPage /></ProtectedRoute>} />
      <Route path="/essays" element={<ProtectedRoute><EssaysPage /></ProtectedRoute>} />
      <Route path="/lors" element={<ProtectedRoute><LORsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <AppRoutes />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-light)',
                  fontSize: '13px',
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                },
              }}
            />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
