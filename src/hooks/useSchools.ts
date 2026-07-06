import { useEffect, useState, useCallback } from 'react'
import { getSchools, addSchool, updateSchool, deleteSchool } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import type { School } from '@/types'
import toast from 'react-hot-toast'
import { FirebaseError } from 'firebase/app'

function fbMsg(err: unknown, fallback: string): string {
  console.error('Firebase error:', JSON.stringify(err))
  if (err instanceof FirebaseError) {
    if (err.code === 'permission-denied')
      return 'Firestore permission denied — paste firestore.rules into Firebase Console → Firestore → Rules'
    if (err.code === 'failed-precondition')
      return 'Firestore index missing — check the browser console for a setup link'
  }
  return fallback
}

export function useSchools() {
  const { user } = useAuth()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getSchools(user.uid)
      setSchools(data)
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to load schools'), { duration: 6000 })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const add = async (data: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addSchool(data)
      await refresh()
      toast.success(`${data.name} added`)
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to add school'), { duration: 6000 })
    }
  }

  const update = async (id: string, data: Partial<School>) => {
    try {
      await updateSchool(id, data)
      setSchools(prev => prev.map(s => (s.id === id ? { ...s, ...data } : s)))
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to update school'), { duration: 6000 })
    }
  }

  const remove = async (id: string, name: string) => {
    try {
      await deleteSchool(id)
      setSchools(prev => prev.filter(s => s.id !== id))
      toast.success(`${name} removed`)
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to remove school'), { duration: 6000 })
    }
  }

  return { schools, loading, refresh, add, update, remove }
}
