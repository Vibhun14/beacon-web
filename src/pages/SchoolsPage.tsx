import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, ExternalLink, Trash2, X, Globe, Sparkles, Send } from 'lucide-react'
import { useSchools } from '@/hooks/useSchools'
import { useEssays } from '@/hooks/useEssays'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { searchLocalColleges, getCollegeById, getColleges } from '@/lib/collegeScorecard'
import { addEssay, getActivities, getHonors, deleteEssay, deleteSchool } from '@/lib/db'
import { callGemini } from '@/lib/gemini'
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui'
import type { ApplicationStatus, DecisionPlan, CollegeData, School, OnboardingData, ProfileStats, FitResult } from '@/types'
import { CHECKLIST_KEYS } from '@/types'
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

const CHECKLIST_LABELS: Record<string, string> = {
  portalCreated: 'Create portal account',
  commonAppSubmitted: 'Submit Common App',
  supplementSubmitted: 'Submit school-specific supplement',
  appFeePaid: 'Pay application fee',
  testScoresSent: 'Submit SAT/ACT scores',
  counselorLOR: 'Request counselor LOR',
  teacherLOR1: 'Request teacher LOR #1',
  teacherLOR2: 'Request teacher LOR #2',
  cssProfile: 'Submit CSS Profile',
  fafsa: 'Submit FAFSA',
}

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

function loadFitCache(): Record<string, FitResult> {
  try { return JSON.parse(localStorage.getItem('beacon-fit-v1') ?? '{}') }
  catch { return {} }
}

function FitPanel({ result }: { result: FitResult }) {
  const score = result.fitScore
  const color = score >= 75 ? 'text-success' : score >= 50 ? 'text-warn' : 'text-danger'
  const barColor = score >= 75 ? 'bg-success' : score >= 50 ? 'bg-warn' : 'bg-danger'
  return (
    <div className="rounded-b-xl border border-t-0 border-beacon/20 bg-beacon-dim/20 px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <div><p className="text-sm font-semibold text-light">{result.fitLabel}</p><p className="text-xs text-muted">AI Fit Score</p></div>
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden ml-2">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-success mb-1.5">Strengths</p>
          <ul className="space-y-0.5">{result.strengths.map((s, i) => <li key={i} className="text-xs text-body">· {s}</li>)}</ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-warn mb-1.5">Gaps</p>
          <ul className="space-y-0.5">{result.gaps.map((g, i) => <li key={i} className="text-xs text-body">· {g}</li>)}</ul>
        </div>
      </div>
      {result.tip && <p className="text-xs text-beacon">💡 {result.tip}</p>}
    </div>
  )
}

type DetailTab = 'info' | 'checklist' | 'interview' | 'ai'

interface ChatMsg { role: 'user' | 'ai'; text: string }

export function SchoolsPage() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { schools, loading, add, update, refresh } = useSchools()
  const { essays } = useEssays()
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [selectedCollege, setSelectedCollege] = useState<CollegeData | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('info')
  const [detailForm, setDetailForm] = useState({
    deadline: '', portalUrl: '', notes: '', decisionPlan: 'RD' as DecisionPlan,
    interviewType: 'None' as 'None' | 'Alumni' | 'Optional' | 'Required',
    interviewDate: '', interviewFormat: '' as '' | 'Virtual' | 'In-Person',
    interviewNotes: '', interviewOutcome: '',
  })
  const [savingDetail, setSavingDetail] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

  // Cascade delete confirm
  const [confirmDelete, setConfirmDelete] = useState<{ school: School; count: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fit score AI
  const [fitScores, setFitScores] = useState<Record<string, FitResult>>(loadFitCache)
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})
  const [expandedFit, setExpandedFit] = useState<Set<string>>(new Set())
  const [actCount, setActCount] = useState(0)
  const [honCount, setHonCount] = useState(0)

  // AI chat (per modal open)
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const results = query.trim().length >= 2 ? searchLocalColleges(query) : []

  useEffect(() => {
    if (!user) return
    Promise.all([getActivities(user.uid), getHonors(user.uid)])
      .then(([a, h]) => { setActCount(a.length); setHonCount(h.length) })
      .catch(() => {})
  }, [user])

  const hasMigrated = useRef(false)
  useEffect(() => {
    if (loading || !user || hasMigrated.current) return
    const needsMigration = schools.filter(s => !s.collegeId && s.name)
    if (!needsMigration.length) { hasMigrated.current = true; return }
    const allColleges = getColleges()
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    needsMigration.forEach(school => {
      const match = allColleges.find(c => norm(c.name) === norm(school.name))
      if (match) update(school.id, { collegeId: match.id })
    })
    hasMigrated.current = true
  }, [schools, loading, user])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleAdd = async (college: CollegeData) => {
    if (!user) return
    await add({
      userId: user.uid, unitId: 0, collegeId: college.id, name: college.name,
      city: college.location.city, state: college.location.state,
      acceptanceRate: college.cds.acceptanceRate, avgSAT: college.cds.sat50, avgACT: college.cds.act50,
      inStateTuition: college.tuitionInState, outStateTuition: college.tuitionOutOfState,
      enrollment: college.totalEnrollment, ranking: college.rankingOverall ?? undefined,
      averageAid: college.averageAid, averageStartingSalary: college.averageStartingSalary,
      status: 'researching', decisionPlan: 'RD',
    })
    if (college.supplementalPrompts.length > 0) {
      await Promise.all(college.supplementalPrompts.map(p => addEssay({
        userId: user.uid, schoolId: college.id, schoolName: college.name,
        prompt: p.prompt, wordLimit: p.wordLimit ?? null, category: p.category, status: 'not_started',
      })))
      toast.success(`Added ${college.supplementalPrompts.length} essay prompt${college.supplementalPrompts.length !== 1 ? 's' : ''} for ${college.name}`)
    }
    setShowSearch(false)
    setQuery('')
  }

  const openDetail = (school: School) => {
    setSelectedSchool(school)
    setDetailTab('info')
    setDetailForm({
      deadline: school.deadline ?? '',
      portalUrl: school.portalUrl ?? '',
      notes: school.notes ?? '',
      decisionPlan: school.decisionPlan,
      interviewType: school.interviewType ?? 'None',
      interviewDate: school.interviewDate ?? '',
      interviewFormat: school.interviewFormat ?? '',
      interviewNotes: school.interviewNotes ?? '',
      interviewOutcome: school.interviewOutcome ?? '',
    })
    setSelectedCollege(school.collegeId ? (getCollegeById(school.collegeId) ?? null) : null)
    setChatHistory([])
    setChatInput('')
  }

  const handleSaveDetail = async () => {
    if (!selectedSchool) return
    setSavingDetail(true)
    try {
      const data = {
        deadline: detailForm.deadline || undefined,
        portalUrl: detailForm.portalUrl || undefined,
        notes: detailForm.notes || undefined,
        decisionPlan: detailForm.decisionPlan,
      }
      await update(selectedSchool.id, data)
      setSelectedSchool(prev => prev ? { ...prev, ...data } : null)
      toast.success('Saved')
    } finally { setSavingDetail(false) }
  }

  const handleSaveInterview = async () => {
    if (!selectedSchool) return
    setSavingDetail(true)
    try {
      const data = {
        interviewType: detailForm.interviewType,
        interviewDate: detailForm.interviewDate || undefined,
        interviewFormat: detailForm.interviewFormat || undefined,
        interviewNotes: detailForm.interviewNotes || undefined,
        interviewOutcome: detailForm.interviewOutcome || undefined,
      }
      await update(selectedSchool.id, data)
      setSelectedSchool(prev => prev ? { ...prev, ...data } : null)
      toast.success('Interview info saved')
    } finally { setSavingDetail(false) }
  }

  const handleNotesBlur = async () => {
    if (!selectedSchool || detailForm.notes === (selectedSchool.notes ?? '')) return
    setNotesSaving(true)
    try {
      await update(selectedSchool.id, { notes: detailForm.notes || undefined })
      setSelectedSchool(prev => prev ? { ...prev, notes: detailForm.notes || undefined } : null)
    } finally { setNotesSaving(false) }
  }

  const toggleChecklist = async (school: School, key: string) => {
    const current = school.checklist ?? {}
    const next = { ...current, [key]: !current[key] }
    await update(school.id, { checklist: next })
    if (selectedSchool?.id === school.id) {
      setSelectedSchool(prev => prev ? { ...prev, checklist: next } : null)
    }
  }

  const handleFitClick = async (e: React.MouseEvent, school: School) => {
    e.stopPropagation()
    if (fitScores[school.id]) {
      setExpandedFit(prev => { const s = new Set(prev); s.has(school.id) ? s.delete(school.id) : s.add(school.id); return s })
      return
    }
    if (analyzing[school.id]) return
    setAnalyzing(prev => ({ ...prev, [school.id]: true }))
    try {
      const p = profile as (OnboardingData & ProfileStats) | null
      const college = school.collegeId ? getCollegeById(school.collegeId) : undefined
      const promptText = `You are a college admissions expert. Return ONLY valid JSON (no markdown):
{
  "fitScore": 72,
  "fitLabel": "Good Match",
  "strengths": ["Strength 1", "Strength 2"],
  "gaps": ["Gap 1", "Gap 2"],
  "tip": "One actionable tip."
}
fitLabel: "Safety" | "Likely" | "Good Match" | "Reach" | "Stretch". fitScore 0-100.

Student: GPA ${(p as unknown as Record<string,unknown>)?.gpaWeighted ?? p?.gpa ?? '?'}, SAT ${(p as unknown as Record<string,unknown>)?.satTotal ?? p?.sat ?? '?'}, ACT ${(p as unknown as Record<string,unknown>)?.actComposite ?? p?.act ?? '?'}, ${actCount} activities, ${honCount} honors, state: ${p?.state ?? '?'}, major: ${p?.intendedMajor ?? 'undecided'}
School: ${school.name}, admit rate: ${school.acceptanceRate != null ? Math.round(school.acceptanceRate * 100) + '%' : '?'}, avg SAT: ${school.avgSAT ?? '?'}, rank: ${school.ranking != null ? '#' + school.ranking : '?'}, type: ${college?.type ?? '?'}`

      const text = await callGemini({ contents: [{ parts: [{ text: promptText }] }] })
      const m = text.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('No JSON')
      const result = JSON.parse(m[0]) as FitResult
      const cache = loadFitCache(); cache[school.id] = result
      localStorage.setItem('beacon-fit-v1', JSON.stringify(cache))
      setFitScores(prev => ({ ...prev, [school.id]: result }))
      setExpandedFit(prev => new Set([...prev, school.id]))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI analysis failed')
    } finally { setAnalyzing(prev => ({ ...prev, [school.id]: false })) }
  }

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading || !selectedSchool) return
    const msg = chatInput.trim()
    setChatInput('')
    const newHistory: ChatMsg[] = [...chatHistory, { role: 'user', text: msg }]
    setChatHistory(newHistory)
    setChatLoading(true)
    try {
      const p = profile as (OnboardingData & ProfileStats) | null
      const conversation = [
        `You are Beacon, a friendly college admissions research assistant. Keep responses concise (2-3 paragraphs max). Use specific facts.`,
        `Student: GPA ${(p as unknown as Record<string,unknown>)?.gpaWeighted ?? p?.gpa ?? '?'}, SAT ${(p as unknown as Record<string,unknown>)?.satTotal ?? p?.sat ?? '?'}, major: ${p?.intendedMajor ?? 'undecided'}.`,
        `Current school: ${selectedSchool.name}, admit rate: ${selectedSchool.acceptanceRate != null ? Math.round(selectedSchool.acceptanceRate * 100) + '%' : 'unknown'}.`,
        ...newHistory.map(m => `${m.role === 'user' ? 'Student' : 'Beacon'}: ${m.text}`),
      ].join('\n')
      const text = await callGemini({ contents: [{ parts: [{ text: conversation }] }] })
      setChatHistory(prev => [...prev, { role: 'ai', text }])
    } catch { toast.error('AI response failed') }
    finally { setChatLoading(false) }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDelete || deleting) return
    const { school, count } = confirmDelete
    const schoolEssays = essays.filter(e =>
      e.schoolName === school.name || (school.collegeId && e.schoolId === school.collegeId)
    )
    setDeleting(true)
    try {
      await Promise.all(schoolEssays.map(e => deleteEssay(e.id)))
      await deleteSchool(school.id)
      await refresh()
      setConfirmDelete(null)
      toast.success(`${school.name}${count > 0 ? ` and ${count} essay${count !== 1 ? 's' : ''}` : ''} removed`)
    } catch { toast.error('Failed to remove school') }
    finally { setDeleting(false) }
  }

  const askDelete = (e: React.MouseEvent, school: School) => {
    e.stopPropagation()
    const count = essays.filter(es =>
      es.schoolName === school.name || (school.collegeId && es.schoolId === school.collegeId)
    ).length
    setConfirmDelete({ school, count })
  }

  const CHIPS = selectedSchool ? [
    `What research at ${selectedSchool.name} fits my interests?`,
    `Which ECs should I highlight for ${selectedSchool.name}?`,
    `What values does ${selectedSchool.name} emphasize in essays?`,
  ] : []

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-light">Schools</h1>
          <p className="text-sm text-muted mt-0.5">{schools.length} school{schools.length !== 1 ? 's' : ''} on your list</p>
        </div>
        <Button onClick={() => setShowSearch(true)}><Plus size={14} /> Add School</Button>
      </div>

      {/* Search modal */}
      {showSearch && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24 px-4" onClick={() => setShowSearch(false)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-card" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <h2 className="font-semibold text-light mb-3">Search Schools</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input autoFocus placeholder="Type a school name or abbreviation…" value={query} onChange={e => setQuery(e.target.value)}
                  className="w-full bg-ink border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all" />
              </div>
            </div>
            {results.length > 0 && (
              <div className="border-t border-border max-h-72 overflow-y-auto">
                {results.map(c => (
                  <button key={c.id} onClick={() => handleAdd(c)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-border transition-colors text-left">
                    <div>
                      <p className="text-sm font-medium text-light">{c.name}</p>
                      <p className="text-xs text-muted">{c.location.city}, {c.location.state}{c.rankingOverall ? ` · #${c.rankingOverall}` : ''}</p>
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

      {/* Confirm delete dialog */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center px-4">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-sm p-6 shadow-card">
            <h3 className="font-semibold text-light mb-2">Remove {confirmDelete.school.name}?</h3>
            <p className="text-sm text-muted mb-5">
              {confirmDelete.count > 0
                ? `This will also delete ${confirmDelete.count} associated essay${confirmDelete.count !== 1 ? 's' : ''}.`
                : 'This action cannot be undone.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleConfirmDelete} loading={deleting} className="flex-1 !bg-danger !border-danger hover:opacity-90">Remove</Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detail modal */}
      {selectedSchool && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto" onClick={() => setSelectedSchool(null)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-xl shadow-card mb-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-light text-lg">{selectedSchool.name}</h2>
                <p className="text-sm text-muted mt-0.5">{selectedSchool.city}, {selectedSchool.state}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedSchool.website && (
                  <a href={`https://${selectedSchool.website}`} target="_blank" rel="noreferrer" className="text-muted hover:text-beacon"><Globe size={16} /></a>
                )}
                <button onClick={() => setSelectedSchool(null)} className="text-muted hover:text-light"><X size={16} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-border bg-ink">
              {(['info','checklist','interview','ai'] as DetailTab[]).map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${detailTab === t ? 'bg-beacon text-white' : 'text-muted hover:text-light'}`}>
                  {t === 'ai' ? 'Ask AI' : t === 'checklist' ? `Checklist (${Object.values(selectedSchool.checklist ?? {}).filter(Boolean).length}/${CHECKLIST_KEYS.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {detailTab === 'info' && (
              <>
                <div className="p-5 border-b border-border">
                  <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <StatRow label="Acceptance Rate" value={selectedSchool.acceptanceRate != null ? `${Math.round(selectedSchool.acceptanceRate * 100)}%` : '—'} />
                    <StatRow label="Avg SAT" value={fmt(selectedSchool.avgSAT)} />
                    <StatRow label="Avg ACT" value={fmt(selectedSchool.avgACT)} />
                    <StatRow label="Enrollment" value={fmt(selectedSchool.enrollment)} />
                    <StatRow label="In-State" value={fmt(selectedSchool.inStateTuition, '$')} />
                    <StatRow label="Out-of-State" value={fmt(selectedSchool.outStateTuition, '$')} />
                    {selectedSchool.ranking != null && <StatRow label="Ranking" value={`#${selectedSchool.ranking}`} />}
                    {selectedSchool.averageAid != null && <StatRow label="Avg Aid" value={fmt(selectedSchool.averageAid, '$')} />}
                  </div>
                </div>
                {selectedCollege && (
                  <div className="p-5 border-b border-border">
                    <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Beacon Data</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {selectedCollege.rankingOverall && <StatRow label="Ranking" value={`#${selectedCollege.rankingOverall}`} />}
                      {selectedCollege.averageAid > 0 && <StatRow label="Avg Aid" value={`$${selectedCollege.averageAid.toLocaleString()}`} />}
                      {selectedCollege.averageStartingSalary > 0 && <StatRow label="Avg Salary" value={`$${selectedCollege.averageStartingSalary.toLocaleString()}`} />}
                      <StatRow label="Campus" value={selectedCollege.campusSetting} />
                      {selectedCollege.deadlines.earlyDecision && <StatRow label="ED" value={selectedCollege.deadlines.earlyDecision} />}
                      {selectedCollege.deadlines.earlyAction && <StatRow label="EA" value={selectedCollege.deadlines.earlyAction} />}
                      {selectedCollege.deadlines.regularDecision && <StatRow label="RD" value={selectedCollege.deadlines.regularDecision} />}
                    </div>
                  </div>
                )}
                <div className="p-5 flex flex-col gap-4">
                  <h3 className="text-xs font-medium text-muted uppercase tracking-wide">Application Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Deadline" type="date" value={detailForm.deadline} onChange={e => setDetailForm(f => ({ ...f, deadline: e.target.value }))} />
                    <Select label="Decision Plan" value={detailForm.decisionPlan} onChange={e => setDetailForm(f => ({ ...f, decisionPlan: e.target.value as DecisionPlan }))}>
                      {(['ED','EA','EDII','REA','RD'] as DecisionPlan[]).map(p => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </div>
                  <Input label="Portal URL" placeholder="https://apply.university.edu" value={detailForm.portalUrl} onChange={e => setDetailForm(f => ({ ...f, portalUrl: e.target.value }))} />
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-body uppercase tracking-wide">Notes</label>
                      {notesSaving && <span className="text-xs text-muted">Saving…</span>}
                    </div>
                    <textarea rows={3} className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
                      placeholder="Supplemental essay topics, contacts, etc." value={detailForm.notes}
                      onChange={e => setDetailForm(f => ({ ...f, notes: e.target.value }))} onBlur={handleNotesBlur} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveDetail} loading={savingDetail} className="flex-1">Save Changes</Button>
                    <Button variant="ghost" onClick={() => setSelectedSchool(null)}>Cancel</Button>
                  </div>
                </div>
              </>
            )}

            {/* Tab: Checklist */}
            {detailTab === 'checklist' && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-muted uppercase tracking-wide">Application Checklist</h3>
                  <span className="text-xs text-muted">
                    {Object.values(selectedSchool.checklist ?? {}).filter(Boolean).length}/{CHECKLIST_KEYS.length} complete
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-border rounded-full overflow-hidden mb-5">
                  <div className="h-full bg-beacon rounded-full transition-all"
                    style={{ width: `${(Object.values(selectedSchool.checklist ?? {}).filter(Boolean).length / CHECKLIST_KEYS.length) * 100}%` }} />
                </div>
                <div className="flex flex-col gap-3">
                  {CHECKLIST_KEYS.map(key => {
                    const done = !!(selectedSchool.checklist?.[key])
                    return (
                      <label key={key} className="flex items-center gap-3 cursor-pointer group">
                        <button
                          onClick={() => toggleChecklist(selectedSchool, key)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${done ? 'bg-beacon border-beacon' : 'border-border group-hover:border-beacon/50'}`}
                        >
                          {done && <span className="text-white text-xs">✓</span>}
                        </button>
                        <span className={`text-sm transition-colors ${done ? 'text-muted line-through' : 'text-body'}`}>{CHECKLIST_LABELS[key]}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tab: Interview */}
            {detailTab === 'interview' && (
              <div className="p-5 flex flex-col gap-4">
                <h3 className="text-xs font-medium text-muted uppercase tracking-wide">Interview Tracker</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Interview Type</label>
                    <select value={detailForm.interviewType} onChange={e => setDetailForm(f => ({ ...f, interviewType: e.target.value as 'None'|'Alumni'|'Optional'|'Required' }))}
                      className="w-full bg-ink border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40">
                      {['None','Alumni','Optional','Required'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <Input label="Interview Date" type="date" value={detailForm.interviewDate} onChange={e => setDetailForm(f => ({ ...f, interviewDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Format</label>
                  <div className="flex gap-2">
                    {['Virtual','In-Person'].map(fmt => (
                      <button key={fmt} onClick={() => setDetailForm(f => ({ ...f, interviewFormat: fmt as 'Virtual'|'In-Person' }))}
                        className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${detailForm.interviewFormat === fmt ? 'border-beacon bg-beacon-dim text-beacon' : 'border-border text-muted hover:text-light'}`}>
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Notes</label>
                  <textarea rows={3} className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
                    placeholder="Interviewer name, topics discussed…" value={detailForm.interviewNotes}
                    onChange={e => setDetailForm(f => ({ ...f, interviewNotes: e.target.value }))} />
                </div>
                <Input label="Outcome" placeholder="Completed, Awaiting feedback…" value={detailForm.interviewOutcome} onChange={e => setDetailForm(f => ({ ...f, interviewOutcome: e.target.value }))} />
                <Button onClick={handleSaveInterview} loading={savingDetail}>Save Interview Info</Button>
              </div>
            )}

            {/* Tab: AI Chat */}
            {detailTab === 'ai' && (
              <div className="p-5 flex flex-col gap-3">
                <h3 className="text-xs font-medium text-muted uppercase tracking-wide">Ask Beacon AI</h3>
                {/* Quick chips */}
                {chatHistory.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {CHIPS.map((chip, i) => (
                      <button key={i} onClick={() => { setChatInput(chip) }}
                        className="text-xs bg-beacon-dim text-beacon px-3 py-1.5 rounded-full hover:bg-beacon/20 transition-colors text-left">
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                {/* Chat messages */}
                {chatHistory.length > 0 && (
                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto bg-ink rounded-xl p-3">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] text-xs rounded-xl px-3 py-2 leading-relaxed ${msg.role === 'user' ? 'bg-beacon text-white' : 'bg-surface border border-border text-body'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-muted animate-pulse">Thinking…</div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
                {/* Input */}
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                    placeholder={`Ask about ${selectedSchool.name}…`}
                    className="flex-1 bg-ink border border-border rounded-xl px-3 py-2 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40"
                  />
                  <Button onClick={handleChat} disabled={!chatInput.trim() || chatLoading} className="shrink-0">
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            )}
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
        <div className="flex flex-col gap-2">
          {schools.map(school => {
            const tier = computeTier(school, profile)
            const hasFit = !!fitScores[school.id]
            const isExpanded = expandedFit.has(school.id)
            const isAnalyzing = !!analyzing[school.id]
            const checklistDone = Object.values(school.checklist ?? {}).filter(Boolean).length
            return (
              <div key={school.id}>
                <div className="cursor-pointer" onClick={() => openDetail(school)}>
                  <Card className={`px-5 py-4 flex items-center gap-4 hover:border-beacon/30 transition-colors ${isExpanded && hasFit ? 'rounded-b-none border-b-0' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-light">{school.name}</p>
                        {school.website && (
                          <a href={`https://${school.website}`} target="_blank" rel="noreferrer" className="text-muted hover:text-beacon" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {tier && <Badge color={TIER_COLOR[tier]}>{tier}</Badge>}
                        {school.ranking != null && <span className="text-xs text-muted">#{school.ranking}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                        <span>{school.city}, {school.state}</span>
                        {school.acceptanceRate && <span>{Math.round(school.acceptanceRate * 100)}% admit</span>}
                        {school.avgSAT && <span>SAT {school.avgSAT}</span>}
                        {school.deadline && <span>Due {new Date(school.deadline).toLocaleDateString()}</span>}
                        {checklistDone > 0 && <span className="text-beacon">{checklistDone}/{CHECKLIST_KEYS.length} ✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={e => handleFitClick(e, school)} title={hasFit ? 'Toggle fit score' : 'AI Fit Score'}
                        className={`transition-colors ${isAnalyzing ? 'text-beacon animate-pulse' : hasFit ? 'text-beacon' : 'text-muted hover:text-beacon'}`}>
                        <Sparkles size={14} />
                      </button>
                      <Select value={school.decisionPlan} onChange={e => update(school.id, { decisionPlan: e.target.value as DecisionPlan })} className="w-20 py-1.5 text-xs">
                        {(['ED','EA','EDII','REA','RD'] as DecisionPlan[]).map(p => <option key={p} value={p}>{p}</option>)}
                      </Select>
                      <Select value={school.status} onChange={e => update(school.id, { status: e.target.value as ApplicationStatus })} className="w-36 py-1.5 text-xs">
                        {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </Select>
                      <Badge color={STATUS_COLOR[school.status]}>{STATUS_LABELS[school.status]}</Badge>
                      <button onClick={e => askDelete(e, school)} className="text-muted hover:text-danger transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                </div>
                {isExpanded && hasFit && <FitPanel result={fitScores[school.id]!} />}
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
