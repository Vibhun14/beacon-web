import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { School, Essay, LOR, OnboardingData, Activity, Honor, ProfileStats, Scholarship, AdditionalInfo } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T
}

function toISO(ts: Timestamp | string | undefined): string {
  if (!ts) return new Date().toISOString()
  if (typeof ts === 'string') return ts
  return ts.toDate().toISOString()
}

// ─── Schools ─────────────────────────────────────────────────────────────────

export async function getSchools(userId: string): Promise<School[]> {
  const q = query(
    collection(db, 'schools'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: toISO(d.data().createdAt),
    updatedAt: toISO(d.data().updatedAt),
  })) as School[]
}

export async function addSchool(data: Omit<School, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'schools'), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSchool(id: string, data: Partial<School>): Promise<void> {
  const clean = stripUndefined(data)
  await updateDoc(doc(db, 'schools', id), { ...clean, updatedAt: serverTimestamp() })
}

export async function deleteSchool(id: string): Promise<void> {
  await deleteDoc(doc(db, 'schools', id))
}

// ─── Essays ──────────────────────────────────────────────────────────────────

export async function getEssays(userId: string): Promise<Essay[]> {
  const q = query(
    collection(db, 'essays'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: toISO(d.data().createdAt),
    updatedAt: toISO(d.data().updatedAt),
  })) as Essay[]
}

export async function addEssay(data: Omit<Essay, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'essays'), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEssay(id: string, data: Partial<Essay>): Promise<void> {
  await updateDoc(doc(db, 'essays', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteEssay(id: string): Promise<void> {
  await deleteDoc(doc(db, 'essays', id))
}

// ─── LORs ────────────────────────────────────────────────────────────────────

export async function getLORs(userId: string): Promise<LOR[]> {
  const q = query(
    collection(db, 'lors'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: toISO(d.data().createdAt),
    updatedAt: toISO(d.data().updatedAt),
  })) as LOR[]
}

export async function addLOR(data: Omit<LOR, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'lors'), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateLOR(id: string, data: Partial<LOR>): Promise<void> {
  await updateDoc(doc(db, 'lors', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteLOR(id: string): Promise<void> {
  await deleteDoc(doc(db, 'lors', id))
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(uid: string): Promise<OnboardingData | null> {
  // Try the current flat path
  const snap = await getDoc(doc(db, 'profiles', uid))
  if (snap.exists()) return snap.data() as OnboardingData

  // Migration: data may have been saved at the old nested path before the path change.
  // If found, copy to the new path and return it.
  try {
    const oldSnap = await getDoc(doc(db, 'users', uid, 'profile', 'data'))
    if (oldSnap.exists()) {
      const data = oldSnap.data() as OnboardingData
      await setDoc(doc(db, 'profiles', uid), data)
      return data
    }
  } catch {
    // Old path inaccessible (rules may not cover it) — not an error, just no migration.
  }

  return null
}

export async function setProfile(uid: string, data: OnboardingData): Promise<void> {
  await setDoc(doc(db, 'profiles', uid), data)
}

export async function updateProfileStats(uid: string, data: ProfileStats): Promise<void> {
  await setDoc(doc(db, 'profiles', uid), stripUndefined(data), { merge: true })
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function getActivities(uid: string): Promise<Activity[]> {
  const snap = await getDoc(doc(db, 'activities', `${uid}_activities`))
  if (!snap.exists()) return []
  return (snap.data().activities ?? []) as Activity[]
}

export async function setActivitiesDoc(uid: string, activities: Activity[]): Promise<void> {
  await setDoc(doc(db, 'activities', `${uid}_activities`), { activities })
}

// ─── Honors ──────────────────────────────────────────────────────────────────

export async function getHonors(uid: string): Promise<Honor[]> {
  const snap = await getDoc(doc(db, 'honors', `${uid}_honors`))
  if (!snap.exists()) return []
  return (snap.data().honors ?? []) as Honor[]
}

export async function setHonorsDoc(uid: string, honors: Honor[]): Promise<void> {
  await setDoc(doc(db, 'honors', `${uid}_honors`), { honors })
}

// ─── Scholarships ─────────────────────────────────────────────────────────────

export async function getScholarships(uid: string): Promise<Scholarship[]> {
  const snap = await getDoc(doc(db, 'scholarships', `${uid}_scholarships`))
  return snap.exists() ? (snap.data().scholarships ?? []) as Scholarship[] : []
}

export async function setScholarshipsDoc(uid: string, scholarships: Scholarship[]): Promise<void> {
  await setDoc(doc(db, 'scholarships', `${uid}_scholarships`), { scholarships })
}

// ─── Additional Info ──────────────────────────────────────────────────────────

export async function getAdditionalInfo(uid: string): Promise<AdditionalInfo | null> {
  const snap = await getDoc(doc(db, 'profiles', uid))
  return snap.exists() ? (snap.data().additionalInfo ?? null) : null
}

export async function updateAdditionalInfo(uid: string, data: AdditionalInfo): Promise<void> {
  await setDoc(doc(db, 'profiles', uid), { additionalInfo: data }, { merge: true })
}

// ─── Personal Statement ───────────────────────────────────────────────────────

export async function getPersonalStatement(uid: string): Promise<{ status: string; wordCount: number; notes: string } | null> {
  const snap = await getDoc(doc(db, 'profiles', uid))
  return snap.exists() ? (snap.data().personalStatement ?? null) : null
}

export async function updatePersonalStatement(uid: string, data: { status?: string; wordCount?: number; notes?: string }): Promise<void> {
  await setDoc(doc(db, 'profiles', uid), { personalStatement: data }, { merge: true })
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export async function addWaitlistEmail(email: string): Promise<void> {
  await addDoc(collection(db, 'waitlist'), {
    email,
    source: 'landing',
    createdAt: serverTimestamp(),
  })
}
