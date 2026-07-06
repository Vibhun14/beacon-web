import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, ExternalLink, Trash2, X, Globe } from 'lucide-react'
import { useSchools } from '@/hooks/useSchools'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { searchSchools } from '@/lib/collegeScorecard'
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui'
import type { ApplicationStatus, DecisionPlan, ScorecardSchool, School, OnboardingData } from '@/types'
import toast from 'react-hot-toast'

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  researching: 'Researching', planning: 'Planning', in_progress: 'In Progress',
  submitted: 'Submitted', deferred: 'Deferred', waitlisted: 'Waitlisted',
  accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn',
}

const STATUS_COLOR: Record<ApplicationStatus, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  researching: 'gray', planning: 'gray', in_progress: 'blue',
  submitted: 'blue', deferred: 'yellow', waitlisted: 'yellow',
  accepted: 'green', rejected: 'red', withdrawn: 'gray',
}

const TIER_COLOR = { Reach: 'red', Match: 'yellow', Safety: 'green' } as const

function computeTier(school: School, profile: OnboardingData | null): 'Reach' | 'Match' | 'Safety' | null {
  if (!profile) return null
  let score = 0, count = 0
  if (profile.sat && school.avgSAT) { score += profile.sat - school.avgSAT; count++ }
  if (profile.act && school.avgACT) { score += (profile.act - school.avgACT) * 10; count++ }
  if (count === 0) {
    if (school.acceptanceRate !== undefined) {
      if (school.acceptanceRate < 0.15) return 'Reach'
      if (school.acceptanceRate < 0.40) return 'Match'
      return 'Safety'
    }
    return null
  }
  const avg = score / count
  if (avg < -100) return 'Reach'
  if (avg > 100) return 'Safety'
  return 'Match'
}

function fmt(n: number | undefined, prefix = '') {
  if (n == null) return '—'
  return prefix + n.toLocaleString()
}

export function SchoolsPage() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { schools, loading, add, update, remove } = useSchools()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScorecardSchool[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [detailForm, setDetailForm] = useState({ deadline: '', portalUrl: '', notes: '', decisionPlan: 'RD' as DecisionPlan })
  const [savingDetail, setSavingDetail] = useState(false)

  // Debounced live search — fires 400 ms after the user stops typing
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchSchools(query)
        setResults(res)
      } catch {
        toast.error('Search failed')
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const handleAdd = async (s: ScorecardSchool) => {
    if (!user || !s['school.name']) return
    const cr = s['latest.admissions.sat_scores.midpoint.critical_reading'] ?? 0
    const math = s['latest.admissions.sat_scores.midpoint.math'] ?? 0
    const satTotal = cr + math
    await add({
      userId: user.uid,
      unitId: s.id,
      name: s['school.name'] ?? '',
      city: s['school.city'] ?? '',
      state: s['school.state'] ?? '',
      website: s['school.school_url'],
      acceptanceRate: s['latest.admissions.admission_rate.overall'],
      avgSAT: satTotal > 0 ? satTotal : undefined,
      avgACT: s['latest.admissions.act_scores.midpoint.cumulative'],
      inStateTuition: s['latest.cost.tuition.in_state'],
      outStateTuition: s['latest.cost.tuition.out_of_state'],
      enrollment: s['latest.student.size'],
      status: 'researching',
      decisionPlan: 'RD',
    })
    setShowSearch(false)
    setQuery('')
    setResults([])
  }

  const openDetail = (school: School) => {
    setSelectedSchool(school)
    setDetailForm({
      deadline: school.deadline ?? '',
      portalUrl: school.portalUrl ?? '',
      notes: school.notes ?? '',
      decisionPlan: school.decisionPlan,
    })
  }

  const handleSaveDetail = async () => {
    if (!selectedSchool) return
    setSavingDetail(true)
    try {
      await update(selectedSchool.id, {
        deadline: detailForm.deadline || undefined,
        portalUrl: detailForm.portalUrl || undefined,
        notes: detailForm.notes || undefined,
        decisionPlan: detailForm.decisionPlan,
      })
      setSelectedSchool(prev => prev ? {
        ...prev,
        ...detailForm,
        deadline: detailForm.deadline || undefined,
        portalUrl: detailForm.portalUrl || undefined,
        notes: detailForm.notes || undefined,
      } : null)
      toast.success('Saved')
    } finally {
      setSavingDetail(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-light">Schools</h1>
          <p className="text-sm text-muted mt-0.5">{schools.length} school{schools.length !== 1 ? 's' : ''} on your list</p>
        </div>
        <Button onClick={() => setShowSearch(true)}><Plus size={14} /> Add School</Button>
      </div>

      {/* Search modal — rendered in a portal so fixed positioning covers the full viewport */}
      {showSearch && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24 px-4" onClick={() => setShowSearch(false)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-card" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <h2 className="font-semibold text-light mb-3">Search Schools</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  autoFocus
                  placeholder="Type a school name…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-ink border border-border rounded-xl pl-8 pr-8 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-border border-t-beacon rounded-full animate-spin" />
                )}
              </div>
              {query.trim().length > 0 && query.trim().length < 2 && (
                <p className="text-xs text-muted mt-2">Keep typing…</p>
              )}
            </div>
            {results.length > 0 && (
              <div className="border-t border-border max-h-72 overflow-y-auto">
                {results.map(s => (
                  <button key={s.id} onClick={() => handleAdd(s)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-border transition-colors text-left">
                    <div>
                      <p className="text-sm font-medium text-light">{s['school.name'] ?? 'Unknown'}</p>
                      <p className="text-xs text-muted">{[s['school.city'], s['school.state']].filter(Boolean).join(', ')}</p>
                    </div>
                    <Plus size={14} className="text-beacon shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Detail modal — portal prevents clipping from parent overflow/transform */}
      {selectedSchool && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto" onClick={() => setSelectedSchool(null)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-xl shadow-card mb-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-light text-lg">{selectedSchool.name}</h2>
                <p className="text-sm text-muted mt-0.5">{selectedSchool.city}, {selectedSchool.state}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedSchool.website && (
                  <a href={`https://${selectedSchool.website}`} target="_blank" rel="noreferrer" className="text-muted hover:text-beacon">
                    <Globe size={16} />
                  </a>
                )}
                <button onClick={() => setSelectedSchool(null)} className="text-muted hover:text-light"><X size={16} /></button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 border-b border-border">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <StatRow label="Acceptance Rate" value={selectedSchool.acceptanceRate != null ? `${Math.round(selectedSchool.acceptanceRate * 100)}%` : '—'} />
                <StatRow label="Avg SAT" value={fmt(selectedSchool.avgSAT)} />
                <StatRow label="Avg ACT" value={fmt(selectedSchool.avgACT)} />
                <StatRow label="Enrollment" value={fmt(selectedSchool.enrollment)} />
                <StatRow label="In-State Tuition" value={fmt(selectedSchool.inStateTuition, '$')} />
                <StatRow label="Out-of-State Tuition" value={fmt(selectedSchool.outStateTuition, '$')} />
              </div>
            </div>

            {/* Editable fields */}
            <div className="p-6 flex flex-col gap-4">
              <h3 className="text-xs font-medium text-muted uppercase tracking-wide">Application Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Deadline" type="date" value={detailForm.deadline} onChange={e => setDetailForm(f => ({ ...f, deadline: e.target.value }))} />
                <Select label="Decision Plan" value={detailForm.decisionPlan} onChange={e => setDetailForm(f => ({ ...f, decisionPlan: e.target.value as DecisionPlan }))}>
                  {(['ED','EA','EDII','REA','RD'] as DecisionPlan[]).map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>
              <Input label="Portal URL" placeholder="https://apply.university.edu" value={detailForm.portalUrl} onChange={e => setDetailForm(f => ({ ...f, portalUrl: e.target.value }))} />
              <div>
                <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Notes</label>
                <textarea
                  className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
                  rows={3}
                  placeholder="Supplemental essay topics, contacts, etc."
                  value={detailForm.notes}
                  onChange={e => setDetailForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveDetail} loading={savingDetail} className="flex-1">Save Changes</Button>
                <Button variant="ghost" onClick={() => setSelectedSchool(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* School list */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : schools.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted text-sm mb-4">No schools yet. Add your first one.</p>
          <Button onClick={() => setShowSearch(true)}><Plus size={14} /> Add School</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {schools.map(school => {
            const tier = computeTier(school, profile)
            return (
              <div key={school.id} className="cursor-pointer" onClick={() => openDetail(school)}>
              <Card
                className="px-5 py-4 flex items-center gap-4 hover:border-beacon/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-light">{school.name}</p>
                    {school.website && (
                      <a href={`https://${school.website}`} target="_blank" rel="noreferrer" className="text-muted hover:text-beacon" onClick={e => e.stopPropagation()}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {tier && <Badge color={TIER_COLOR[tier]}>{tier}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                    <span>{school.city}, {school.state}</span>
                    {school.acceptanceRate && <span>{Math.round(school.acceptanceRate * 100)}% admit</span>}
                    {school.avgSAT && <span>SAT {school.avgSAT}</span>}
                    {school.deadline && <span>Due {new Date(school.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                  <Select value={school.decisionPlan} onChange={e => update(school.id, { decisionPlan: e.target.value as DecisionPlan })} className="w-20 py-1.5 text-xs">
                    {(['ED','EA','EDII','REA','RD'] as DecisionPlan[]).map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                  <Select value={school.status} onChange={e => update(school.id, { status: e.target.value as ApplicationStatus })} className="w-36 py-1.5 text-xs">
                    {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </Select>
                  <Badge color={STATUS_COLOR[school.status]}>{STATUS_LABELS[school.status]}</Badge>
                  <button onClick={e => { e.stopPropagation(); remove(school.id, school.name) }} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-light font-medium">{value}</span>
    </div>
  )
}
