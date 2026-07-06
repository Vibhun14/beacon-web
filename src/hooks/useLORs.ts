import { useEffect, useState, useCallback } from 'react'
import { getLORs, addLOR, updateLOR, deleteLOR } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import type { LOR } from '@/types'
import toast from 'react-hot-toast'
import { FirebaseError } from 'firebase/app'

function fbMsg(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) {
    if (err.code === 'permission-denied')
      return 'Firestore permission denied — paste firestore.rules into Firebase Console → Firestore → Rules'
    if (err.code === 'failed-precondition')
      return 'Firestore index missing — check the browser console for a setup link'
  }
  return fallback
}

export function useLORs() {
  const { user } = useAuth()
  const [lors, setLORs] = useState<LOR[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getLORs(user.uid)
      setLORs(data)
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to load recommendations'), { duration: 6000 })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const add = async (data: Omit<LOR, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addLOR(data)
      await refresh()
      toast.success(`LOR from ${data.recommenderName} added`)
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to add recommendation'), { duration: 6000 })
    }
  }

  const update = async (id: string, data: Partial<LOR>) => {
    try {
      await updateLOR(id, data)
      setLORs(prev => prev.map(l => (l.id === id ? { ...l, ...data } : l)))
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to update recommendation'), { duration: 6000 })
    }
  }

  const remove = async (id: string, name: string) => {
    try {
      await deleteLOR(id)
      setLORs(prev => prev.filter(l => l.id !== id))
      toast.success(`LOR from ${name} removed`)
    } catch (err) {
      toast.error(fbMsg(err, 'Failed to remove recommendation'), { duration: 6000 })
    }
  }

  return { lors, loading, refresh, add, update, remove }
}
