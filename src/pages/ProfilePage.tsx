import { useState, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { getActivities, setActivitiesDoc, getHonors, setHonorsDoc, updateProfileStats } from '@/lib/db'
import { ResumeImporter } from '@/components/profile/ResumeImporter'
import { Card, Button, Spinner } from '@/components/ui'
import type { Activity, ActivityType, TimingType, Honor, HonorLevel, ProfileStats, OnboardingData } from '@/types'
import toast from 'react-hot-toast'

// ─── Defaults ─────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: ActivityType[] = ['Club', 'Sport', 'Work', 'Volunteer', 'Research', 'Internship', 'Arts', 'Other']
const TIMING_OPTIONS: TimingType[] = ['School year', 'Summer', 'Both']
const HONOR_LEVELS: HonorLevel[] = ['School', 'Regional', 'State', 'National', 'International']
const GRADES = [9, 10, 11, 12]

function emptyActivity(): Activity {
  return { type: 'Club', organization: '', role: '', description: '', grades: [], hoursPerWeek: 0, weeksPerYear: 0, continueInCollege: false, timing: 'School year' }
}

function emptyHonor(): Honor {
  return { title: '', grades: [], level: 'School', description: '' }
}

// ─── Grade Checkboxes ─────────────────────────────────────────────────────────

function GradeCheckboxes({ value, onChange }: { value: number[]; onChange: (g: number[]) => void }) {
  const toggle = (g: number) => onChange(value.includes(g) ? value.filter(x => x !== g) : [...value, g].sort())
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted mr-1">Grades:</span>
      {GRADES.map(g => (
        <button
          key={g}
          type="button"
          onClick={() => toggle(g)}
          className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${
            value.includes(g) ? 'bg-beacon-dim text-beacon' : 'bg-border text-muted hover:text-light'
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  )
}

// ─── Activity Card ────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: Activity
  index: number
  total: number
  onChange: (a: Activity) => void
  onMove: (dir: 'up' | 'down') => void
  onDelete: () => void
}

function ActivityCard({ activity: a, index, total, onChange, onMove, onDelete }: ActivityCardProps) {
  const remaining = 150 - a.description.length

  return (
    <Card className="p-5">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-col gap-0.5 mr-1">
          <button
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-0.5 text-muted hover:text-light disabled:opacity-20 transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="p-0.5 text-muted hover:text-light disabled:opacity-20 transition-colors"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <span className="text-xs font-semibold text-muted uppercase tracking-wide flex-1">Activity {index + 1}</span>
        <button onClick={onDelete} className="text-muted hover:text-danger transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Type */}
        <div>
          <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Activity Type</label>
          <select
            value={a.type}
            onChange={e => onChange({ ...a, type: e.target.value as ActivityType })}
            className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
          >
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Role */}
        <div>
          <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Position / Role</label>
          <input
            type="text"
            value={a.role}
            onChange={e => onChange({ ...a, role: e.target.value })}
            placeholder="President, Captain, Intern…"
            className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
          />
        </div>
      </div>

      {/* Organization */}
      <div className="mb-3">
        <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Organization Name</label>
        <input
          type="text"
          value={a.organization}
          onChange={e => onChange({ ...a, organization: e.target.value })}
          placeholder="School Name, Company, Team…"
          className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-body uppercase tracking-wide">Description</label>
          <span className={`text-xs ${remaining < 20 ? 'text-warn' : remaining < 0 ? 'text-danger' : 'text-muted'}`}>
            {remaining} left
          </span>
        </div>
        <textarea
          maxLength={150}
          rows={2}
          value={a.description}
          onChange={e => onChange({ ...a, description: e.target.value })}
          placeholder="Describe your role, impact, and key accomplishments…"
          className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
        />
      </div>

      {/* Bottom row */}
      <div className="flex flex-wrap items-center gap-4">
        <GradeCheckboxes value={a.grades} onChange={grades => onChange({ ...a, grades })} />

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Hrs/wk:</label>
          <input
            type="number"
            min={0}
            max={40}
            value={a.hoursPerWeek || ''}
            onChange={e => onChange({ ...a, hoursPerWeek: parseInt(e.target.value) || 0 })}
            className="w-12 bg-ink border border-border rounded-lg px-2 py-1 text-xs text-light text-center focus:outline-none focus:ring-1 focus:ring-beacon/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Wks/yr:</label>
          <input
            type="number"
            min={0}
            max={52}
            value={a.weeksPerYear || ''}
            onChange={e => onChange({ ...a, weeksPerYear: parseInt(e.target.value) || 0 })}
            className="w-12 bg-ink border border-border rounded-lg px-2 py-1 text-xs text-light text-center focus:outline-none focus:ring-1 focus:ring-beacon/40"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted">Timing:</span>
          {TIMING_OPTIONS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...a, timing: t })}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                a.timing === t ? 'bg-beacon-dim text-beacon' : 'bg-border text-muted hover:text-light'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-muted">Continue in college</span>
          <button
            type="button"
            onClick={() => onChange({ ...a, continueInCollege: !a.continueInCollege })}
            className={`relative w-8 h-4 rounded-full transition-colors ${a.continueInCollege ? 'bg-beacon' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${a.continueInCollege ? 'translate-x-4' : ''}`} />
          </button>
        </label>
      </div>
    </Card>
  )
}

// ─── Honor Card ───────────────────────────────────────────────────────────────

interface HonorCardProps {
  honor: Honor
  index: number
  onChange: (h: Honor) => void
  onDelete: () => void
}

function HonorCard({ honor: h, index, onChange, onDelete }: HonorCardProps) {
  const remaining = 100 - h.description.length

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide flex-1">Honor {index + 1}</span>
        <button onClick={onDelete} className="text-muted hover:text-danger transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Title */}
      <div className="mb-3">
        <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Honor Title</label>
        <input
          type="text"
          value={h.title}
          onChange={e => onChange({ ...h, title: e.target.value })}
          placeholder="National Merit Semifinalist, AP Scholar…"
          className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
        />
      </div>

      {/* Grades + Level */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <GradeCheckboxes value={h.grades} onChange={grades => onChange({ ...h, grades })} />
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-muted">Level:</label>
          <select
            value={h.level}
            onChange={e => onChange({ ...h, level: e.target.value as HonorLevel })}
            className="bg-ink border border-border rounded-xl px-3 py-1.5 text-xs text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
          >
            {HONOR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-body uppercase tracking-wide">Description (optional)</label>
          <span className={`text-xs ${remaining < 20 ? 'text-warn' : 'text-muted'}`}>{remaining} left</span>
        </div>
        <input
          type="text"
          maxLength={100}
          value={h.description}
          onChange={e => onChange({ ...h, description: e.target.value })}
          placeholder="Brief context (optional)"
          className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
        />
      </div>
    </Card>
  )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

interface StatsTabProps {
  stats: ProfileStats
  activitiesCount: number
  honorsCount: number
  onChange: (s: ProfileStats) => void
  onBlur: () => void
}

function StatsTab({ stats, activitiesCount, honorsCount, onChange, onBlur }: StatsTabProps) {
  const num = (v: number | undefined) => (v != null ? String(v) : '')

  const set = (key: keyof ProfileStats, raw: string) => {
    const v = raw === '' ? undefined : Number(raw)
    onChange({ ...stats, [key]: isNaN(v as number) ? undefined : v })
  }

  const addAP = () => onChange({ ...stats, apScores: [...(stats.apScores ?? []), { subject: '', score: 5 }] })
  const removeAP = (i: number) => onChange({ ...stats, apScores: (stats.apScores ?? []).filter((_, idx) => idx !== i) })
  const setAP = (i: number, field: 'subject' | 'score', val: string) =>
    onChange({
      ...stats,
      apScores: (stats.apScores ?? []).map((ap, idx) =>
        idx === i ? { ...ap, [field]: field === 'score' ? (parseInt(val) || 5) : val } : ap
      ),
    })

  const NumInput = ({ label, k, placeholder }: { label: string; k: keyof ProfileStats; placeholder?: string }) => (
    <div>
      <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">{label}</label>
      <input
        type="number"
        value={num(stats[k] as number | undefined)}
        onChange={e => set(k, e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Summary card */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Your Profile at a Glance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'GPA (W)', value: stats.gpaWeighted != null ? stats.gpaWeighted.toFixed(2) : '—' },
            { label: 'SAT', value: stats.satTotal != null ? stats.satTotal.toLocaleString() : '—' },
            { label: 'ACT', value: stats.actComposite != null ? String(stats.actComposite) : '—' },
            { label: 'APs', value: `${(stats.apScores ?? []).length} taken` },
            { label: 'Activities', value: `${activitiesCount} / 10` },
            { label: 'Honors', value: `${honorsCount} / 5` },
            { label: 'Class Rank', value: stats.classRank != null && stats.classSize != null ? `${stats.classRank} / ${stats.classSize}` : '—' },
            { label: 'GPA (UW)', value: stats.gpaUnweighted != null ? stats.gpaUnweighted.toFixed(2) : '—' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-muted mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold text-light">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* GPA */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">GPA</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Weighted GPA" k="gpaWeighted" placeholder="4.5" />
          <NumInput label="Unweighted GPA" k="gpaUnweighted" placeholder="3.9" />
        </div>
      </Card>

      {/* SAT */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">SAT</h3>
        <div className="grid grid-cols-3 gap-3">
          <NumInput label="Total" k="satTotal" placeholder="1550" />
          <NumInput label="Math" k="satMath" placeholder="800" />
          <NumInput label="EBRW" k="satEBRW" placeholder="750" />
        </div>
      </Card>

      {/* ACT */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">ACT</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <NumInput label="Composite" k="actComposite" placeholder="35" />
          <NumInput label="English" k="actEnglish" placeholder="36" />
          <NumInput label="Math" k="actMath" placeholder="35" />
          <NumInput label="Reading" k="actReading" placeholder="35" />
          <NumInput label="Science" k="actScience" placeholder="34" />
        </div>
      </Card>

      {/* Class Rank */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Class Rank (optional)</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Your Rank" k="classRank" placeholder="12" />
          <NumInput label="Class Size" k="classSize" placeholder="400" />
        </div>
      </Card>

      {/* AP / IB Scores */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">AP / IB Scores</h3>
          <Button size="sm" variant="outline" onClick={addAP}>
            <Plus size={12} /> Add Score
          </Button>
        </div>
        {(stats.apScores ?? []).length === 0 ? (
          <p className="text-sm text-muted text-center py-4">No AP/IB scores added yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(stats.apScores ?? []).map((ap, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ap.subject}
                  onChange={e => setAP(i, 'subject', e.target.value)}
                  onBlur={onBlur}
                  placeholder="AP Calculus BC, IB Physics HL…"
                  className="flex-1 bg-ink border border-border rounded-xl px-3 py-2 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
                />
                <select
                  value={ap.score}
                  onChange={e => { setAP(i, 'score', e.target.value); onBlur() }}
                  className="w-16 bg-ink border border-border rounded-xl px-2 py-2 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
                >
                  {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => { removeAP(i); onBlur() }} className="text-muted hover:text-danger transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'activities' | 'honors' | 'stats'

export function ProfilePage() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const [tab, setTab] = useState<Tab>('activities')
  const [activities, setActivitiesState] = useState<Activity[]>([])
  const [honors, setHonorsState] = useState<Honor[]>([])
  const [stats, setStatsState] = useState<ProfileStats>({})
  const [pageLoading, setPageLoading] = useState(true)

  const actTimer = useRef<ReturnType<typeof setTimeout>>()
  const honTimer = useRef<ReturnType<typeof setTimeout>>()

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    Promise.all([getActivities(user.uid), getHonors(user.uid)]).then(([acts, hons]) => {
      setActivitiesState(acts)
      setHonorsState(hons)
      setPageLoading(false)
    }).catch(() => setPageLoading(false))
  }, [user])

  // Init stats from profile (already loaded by ProfileContext)
  useEffect(() => {
    if (!profile) return
    const p = profile as OnboardingData & ProfileStats
    setStatsState({
      gpaWeighted: p.gpaWeighted,
      gpaUnweighted: p.gpaUnweighted,
      satTotal: p.satTotal,
      satMath: p.satMath,
      satEBRW: p.satEBRW,
      actComposite: p.actComposite,
      actEnglish: p.actEnglish,
      actMath: p.actMath,
      actReading: p.actReading,
      actScience: p.actScience,
      classRank: p.classRank,
      classSize: p.classSize,
      apScores: p.apScores ?? [],
    })
  }, [profile])

  // ─── Debounced saves ───────────────────────────────────────────────────────

  const saveActivities = (acts: Activity[]) => {
    setActivitiesState(acts)
    clearTimeout(actTimer.current)
    actTimer.current = setTimeout(async () => {
      if (!user) return
      try {
        await setActivitiesDoc(user.uid, acts)
        toast.success('Saved', { id: 'act-save', duration: 1200 })
      } catch {
        toast.error('Failed to save activities')
      }
    }, 800)
  }

  const saveHonors = (hons: Honor[]) => {
    setHonorsState(hons)
    clearTimeout(honTimer.current)
    honTimer.current = setTimeout(async () => {
      if (!user) return
      try {
        await setHonorsDoc(user.uid, hons)
        toast.success('Saved', { id: 'hon-save', duration: 1200 })
      } catch {
        toast.error('Failed to save honors')
      }
    }, 800)
  }

  const saveStats = async () => {
    if (!user) return
    try {
      await updateProfileStats(user.uid, stats)
      toast.success('Saved', { id: 'stats-save', duration: 1200 })
    } catch {
      toast.error('Failed to save stats')
    }
  }

  // ─── Activity handlers ─────────────────────────────────────────────────────

  const addActivity = () => {
    if (activities.length >= 10) return toast.error('Common App limit: 10 activities')
    saveActivities([...activities, emptyActivity()])
  }

  const updateActivity = (i: number, a: Activity) => {
    saveActivities(activities.map((x, idx) => idx === i ? a : x))
  }

  const deleteActivity = (i: number) => saveActivities(activities.filter((_, idx) => idx !== i))

  const moveActivity = (i: number, dir: 'up' | 'down') => {
    const next = [...activities]
    const swap = dir === 'up' ? i - 1 : i + 1
    ;[next[i], next[swap]] = [next[swap], next[i]]
    saveActivities(next)
  }

  // ─── Honor handlers ────────────────────────────────────────────────────────

  const addHonor = () => {
    if (honors.length >= 5) return toast.error('Common App limit: 5 honors')
    saveHonors([...honors, emptyHonor()])
  }

  const updateHonor = (i: number, h: Honor) => saveHonors(honors.map((x, idx) => idx === i ? h : x))
  const deleteHonor = (i: number) => saveHonors(honors.filter((_, idx) => idx !== i))

  // ─── Resume import handler ─────────────────────────────────────────────────

  const handleResumeImport = (newActs: Activity[], newHons: Honor[]) => {
    const mergedActs = [...activities, ...newActs].slice(0, 10)
    const mergedHons = [...honors, ...newHons].slice(0, 5)
    saveActivities(mergedActs)
    saveHonors(mergedHons)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (pageLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner /></div>
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'activities', label: 'Activities' },
    { id: 'honors', label: 'Honors' },
    { id: 'stats', label: 'Stats' },
  ]

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-light">Profile</h1>
          <p className="text-sm text-muted mt-0.5">
            Activities{' '}
            <span className={activities.length >= 10 ? 'text-warn' : 'text-light font-medium'}>
              {activities.length}/10
            </span>
            {' · '}
            Honors{' '}
            <span className={honors.length >= 5 ? 'text-warn' : 'text-light font-medium'}>
              {honors.length}/5
            </span>
          </p>
        </div>
        {tab === 'activities' && (
          <ResumeImporter onImport={handleResumeImport} />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? 'bg-beacon text-white shadow-sm'
                : 'text-muted hover:text-light'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'activities' && (
        <div className="flex flex-col gap-3">
          {activities.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-muted text-sm mb-4">No activities yet. Add up to 10 (Common App limit).</p>
              <Button onClick={addActivity}><Plus size={14} /> Add Activity</Button>
            </Card>
          ) : (
            <>
              {activities.map((a, i) => (
                <ActivityCard
                  key={i}
                  activity={a}
                  index={i}
                  total={activities.length}
                  onChange={updated => updateActivity(i, updated)}
                  onMove={dir => moveActivity(i, dir)}
                  onDelete={() => deleteActivity(i)}
                />
              ))}
              {activities.length < 10 && (
                <button
                  onClick={addActivity}
                  className="w-full border border-dashed border-border rounded-2xl py-4 text-sm text-muted hover:border-beacon/40 hover:text-beacon transition-colors"
                >
                  <Plus size={14} className="inline mr-1" />
                  Add activity ({10 - activities.length} remaining)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'honors' && (
        <div className="flex flex-col gap-3">
          {honors.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-muted text-sm mb-4">No honors yet. Add up to 5 (Common App limit).</p>
              <Button onClick={addHonor}><Plus size={14} /> Add Honor</Button>
            </Card>
          ) : (
            <>
              {honors.map((h, i) => (
                <HonorCard
                  key={i}
                  honor={h}
                  index={i}
                  onChange={updated => updateHonor(i, updated)}
                  onDelete={() => deleteHonor(i)}
                />
              ))}
              {honors.length < 5 && (
                <button
                  onClick={addHonor}
                  className="w-full border border-dashed border-border rounded-2xl py-4 text-sm text-muted hover:border-beacon/40 hover:text-beacon transition-colors"
                >
                  <Plus size={14} className="inline mr-1" />
                  Add honor ({5 - honors.length} remaining)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <StatsTab
          stats={stats}
          activitiesCount={activities.length}
          honorsCount={honors.length}
          onChange={setStatsState}
          onBlur={saveStats}
        />
      )}
    </div>
  )
}
