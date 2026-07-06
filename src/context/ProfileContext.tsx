import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getProfile, setProfile } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import type { OnboardingData } from '@/types'

// ─── localStorage cache ───────────────────────────────────────────────────────
// Profile is written to localStorage on every save so that on page refresh the
// app has something to show immediately, without waiting for (or being blocked
// by) a Firestore read. Firestore is still synced in the background.

const CACHE_KEY = 'beacon-profile-v1'

function readCache(): OnboardingData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as OnboardingData) : null
  } catch { return null }
}

function writeCache(data: OnboardingData | null) {
  try {
    if (data) localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    else localStorage.removeItem(CACHE_KEY)
  } catch {}
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface ProfileContextValue {
  profile: OnboardingData | null
  profileLoading: boolean
  profileReady: boolean
  profileError: boolean
  saveProfile: (data: OnboardingData) => Promise<void>
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Initialise from cache — avoids the onboarding redirect on every refresh
  const cached = readCache()
  const [profile, setProfileState] = useState<OnboardingData | null>(cached)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(!!cached)
  const [profileError, setProfileError] = useState(false)

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false)
      setProfileReady(true)
      return
    }
    setProfileLoading(true)
    setProfileError(false)
    try {
      const data = await getProfile(user.uid)
      setProfileState(data)
      writeCache(data)
      setProfileReady(true)
    } catch (err) {
      console.error('Profile fetch failed:', err)
      setProfileError(true)
      // Keep whatever the cache gave us — don't redirect to onboarding on error
    } finally {
      setProfileLoading(false)
    }
  }, [user])

  useEffect(() => { refreshProfile() }, [refreshProfile])

  const saveProfile = async (data: OnboardingData) => {
    // Write to cache and state immediately so the UI doesn't need to wait
    writeCache(data)
    setProfileState(data)
    setProfileReady(true)
    setProfileError(false)
    if (!user) return
    await setProfile(user.uid, data)
  }

  return (
    <ProfileContext.Provider value={{ profile, profileLoading, profileReady, profileError, saveProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
