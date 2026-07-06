import { useEffect, useState, useCallback } from 'react'
import { getEssays, addEssay, updateEssay, deleteEssay } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import type { Essay } from '@/types'
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

export function useEssays() {
  const { user } = useAuth()
  const [essays, setEssays] = useState<Essay[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getEssays(user.uid)
      setEssays(data)
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to load essays'), { duration: 6000 })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const add = async (data: Omit<Essay, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addEssay(data)
      await refresh()
      toast.success('Essay added')
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to add essay'), { duration: 6000 })
    }
  }

  const update = async (id: string, data: Partial<Essay>) => {
    try {
      await updateEssay(id, data)
      setEssays(prev => prev.map(e => (e.id === id ? { ...e, ...data } : e)))
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to update essay'), { duration: 6000 })
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteEssay(id)
      setEssays(prev => prev.filter(e => e.id !== id))
      toast.success('Essay removed')
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to remove essay'), { duration: 6000 })
    }
  }

  return { essays, loading, refresh, add, update, remove }
}
