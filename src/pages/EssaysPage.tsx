import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ChevronDown, ChevronRight, Search, Sparkles, X, List, LayoutGrid, MessageSquare } from 'lucide-react'
import { useEssays } from '@/hooks/useEssays'
import { useAuth } from '@/context/AuthContext'
import { callGemini } from '@/lib/gemini'
import { getPersonalStatement, updatePersonalStatement } from '@/lib/db'
import { clusterEssays } from '@/lib/essaySimilarity'
import { Card, Button, Input, Select, Spinner } from '@/components/ui'
import type { Essay, EssayStatus, EssayInsight } from '@/types'
import toast from 'react-hot-toast'

const STATUS_LABELS: Record<EssayStatus, string> = {
  not_started: 'Not Started',
  drafting: 'Drafting',
  revising: 'Revising',
  final: 'Final',
  submitted: 'Submitted',
}

const STATUS_COLOR: Record<EssayStatus, string> = {
  not_started: 'bg-border text-muted',
  drafting: 'bg-warn/10 text-warn',
  revising: 'bg-beacon-dim text-beacon',
  final: 'bg-success/10 text-success',
  submitted: 'bg-success/10 text-success',
}

const CATEGORIES = ['All', 'Community/Diversity', 'Intellectual Curiosity', 'Short Answer', 'Why School', 'Other']

type ViewMode = 'list' | 'clusters'
type SortMode = 'school' | 'priority'

function categoryBadgeClass(cat?: string | null): string {
  switch (cat) {
    case 'Community/Diversity': return 'bg-purple-500/10 text-purple-400'
    case 'Intellectual Curiosity': return 'bg-beacon-dim text-beacon'
    case 'Short Answer': return 'bg-border text-muted'
    case 'Why School': return 'bg-warn/10 text-warn'
    default: return 'bg-border text-muted'
  }
}

function priorityScore(essay: Essay): number {
  let deadlineUrgency = 0
  if (essay.deadline) {
    const days = Math.ceil((new Date(essay.deadline).getTime() - Date.now()) / 86400000)
    deadlineUrgency = Math.max(0, Math.min(100, (30 - days) / 30 * 100))
  }
  const difficulty = Math.min(100, ((essay.wordLimit ?? 0) / 650) * 100)
  const notStarted = essay.status === 'not_started' ? 100 : 0
  return Math.round(deadlineUrgency * 0.4 + 50 * 0.3 + difficulty * 0.15 + notStarted * 0.15)
}

function InsightPanel({ insight, onClose }: { insight: EssayInsight; onClose: () => void }) {
  return (
    <div className="rounded-b-xl border border-t-0 border-beacon/20 bg-beacon-dim/20 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-beacon uppercase tracking-wide">AI Tips</p>
        <button onClick={onClose} className="text-muted hover:text-light"><X size={12} /></button>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-muted mb-1">What they want</p>
          <p className="text-xs text-body">{insight.whatTheyWant}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted mb-1">Common mistakes</p>
          <ul className="space-y-0.5">
            {insight.commonMistakes.map((m, i) => <li key={i} className="text-xs text-body">· {m}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted mb-1">Suggested angle</p>
          <p className="text-xs text-body">{insight.angle}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted mb-1">Opening hook idea</p>
          <p className="text-xs text-body italic">"{insight.openingHook}"</p>
        </div>
      </div>
    </div>
  )
}

interface EssayCardProps {
  essay: Essay
  update: (id: string, data: Partial<Essay>) => Promise<void>
  remove: (id: string) => Promise<void>
}

function EssayCard({ essay, update, remove }: EssayCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [insight, setInsight] = useState<EssayInsight | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
  const wordLimit = essay.wordLimit ?? 0
  const minRead = wordLimit > 0 ? Math.ceil(wordLimit / 200) : 0
  const score = priorityScore(essay)
  const scoreColor = score >= 70 ? 'bg-danger/10 text-danger' : score >= 40 ? 'bg-warn/10 text-warn' : 'bg-border text-muted'

  const handleInsightClick = async () => {
    if (insight) { setShowInsight(s => !s); return }
    if (analyzing) return
    setAnalyzing(true)
    try {
      const promptText = `You are a college admissions essay expert. Analyze this essay prompt and provide strategic advice.

Essay prompt: "${essay.prompt}"
${essay.schoolName ? `School: ${essay.schoolName}` : 'Type: Common App / Universal'}
${essay.category ? `Category: ${essay.category}` : ''}
${wordLimit > 0 ? `Word limit: ${wordLimit}` : ''}

Return ONLY valid JSON (no markdown, no code fences):
{
  "whatTheyWant": "What the admissions committee is really looking for with this prompt",
  "commonMistakes": ["First common mistake students make", "Second common mistake", "Third common mistake"],
  "angle": "A specific, differentiated angle or approach to make this essay stand out",
  "openingHook": "A compelling first sentence or hook to start the essay"
}`
      const text = await callGemini({ contents: [{ parts: [{ text: promptText }] }] })
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const result = JSON.parse(jsonMatch[0]) as EssayInsight
      setInsight(result)
      setShowInsight(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div>
      <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-beacon/20 transition-colors group ${showInsight && insight ? 'rounded-b-none border-b-0' : ''}`}>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm text-light leading-relaxed cursor-pointer ${expanded ? '' : 'truncate'}`}
            onClick={() => setExpanded(e => !e)}
            title={expanded ? undefined : essay.prompt}
          >
            {essay.prompt}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {essay.category && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${categoryBadgeClass(essay.category)}`}>
                {essay.category}
              </span>
            )}
            {wordLimit > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-border text-muted">
                {wordLimit}w
              </span>
            )}
            {minRead > 0 && <span className="text-xs text-muted">~{minRead}m read</span>}
            {essay.deadline && (
              <span className="text-xs text-muted">Due {new Date(essay.deadline).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${scoreColor}`}
            title="Priority score (deadline urgency + difficulty + status)"
          >
            P:{score}
          </span>
          <button
            onClick={handleInsightClick}
            title={insight ? 'Toggle AI tips' : 'Get AI tips'}
            className={`transition-colors ${analyzing ? 'text-beacon animate-pulse' : insight ? 'text-beacon' : 'text-muted hover:text-beacon opacity-0 group-hover:opacity-100'}`}
          >
            <Sparkles size={13} />
          </button>
          <Select
            value={essay.status}
            onChange={e => update(essay.id, { status: e.target.value as EssayStatus })}
            className="w-28 py-1 text-xs"
          >
            {(Object.keys(STATUS_LABELS) as EssayStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
          <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[essay.status]}`}>
            {STATUS_LABELS[essay.status]}
          </span>
          <button
            onClick={() => remove(essay.id)}
            className="text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {showInsight && insight && (
        <InsightPanel insight={insight} onClose={() => setShowInsight(false)} />
      )}
    </div>
  )
}

interface SchoolGroupProps {
  label: string
  essays: Essay[]
  update: (id: string, data: Partial<Essay>) => Promise<void>
  remove: (id: string) => Promise<void>
}

function SchoolGroup({ label, essays, update, remove }: SchoolGroupProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 mb-2 group">
        {open ? <ChevronDown size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted" />}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted group-hover:text-light transition-colors">
          {label}
        </span>
        <span className="text-xs text-muted ml-1">({essays.length})</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5">
          {essays.map(essay => (
            <EssayCard key={essay.id} essay={essay} update={update} remove={remove} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClustersView({ essays }: {
  essays: Essay[]
}) {
  const clusters = useMemo(() => clusterEssays(essays), [essays])

  if (clusters.length === 0) {
    return <p className="text-sm text-muted text-center py-10">No essays to cluster.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="flex items-center gap-2 text-sm text-muted px-1">
        <span>{essays.length} total prompt{essays.length !== 1 ? 's' : ''}</span>
        <span>→</span>
        <span className="text-beacon font-medium">{clusters.length} unique theme{clusters.length !== 1 ? 's' : ''}</span>
        {essays.length > clusters.length && (
          <>
            <span>·</span>
            <span>Save ~{essays.length - clusters.length} essay{essays.length - clusters.length !== 1 ? 's' : ''} worth of work</span>
          </>
        )}
      </div>

      {clusters.map(cluster => {
        const reusable = cluster.essays.length > 1
        return (
          <Card key={cluster.id} className="overflow-hidden">
            {/* Cluster header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-display text-lg text-light">{cluster.theme}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-border text-muted">
                    {cluster.essays.length} essay{cluster.essays.length !== 1 ? 's' : ''}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${reusable ? 'bg-success/10 text-success' : 'bg-border text-muted'}`}>
                    {reusable ? 'Reusable' : 'Unique'}
                  </span>
                </div>
              </div>
              {cluster.keywords.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted">keywords:</span>
                  {cluster.keywords.map(k => (
                    <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-border text-muted">{k}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Essay list */}
            <div className="divide-y divide-border">
              {cluster.essays.map(essay => (
                <div key={essay.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {essay.schoolName && (
                        <span className="text-xs font-medium text-beacon shrink-0">{essay.schoolName}</span>
                      )}
                      {!essay.schoolName && (
                        <span className="text-xs font-medium text-muted shrink-0">Common App</span>
                      )}
                    </div>
                    <p className="text-xs text-body truncate">{essay.prompt}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {essay.wordLimit && (
                      <span className="text-xs text-muted">{essay.wordLimit}w</span>
                    )}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[essay.status]}`}>
                      {STATUS_LABELS[essay.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestion footer */}
            <div className="px-4 py-3 bg-beacon-dim/30 border-t border-border">
              <p className="text-xs text-beacon italic">💡 {cluster.suggestion}</p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function PersonalStatementCard({ uid }: { uid: string }) {
  const [status, setStatus] = useState<EssayStatus>('not_started')
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    getPersonalStatement(uid).then(data => {
      if (data) {
        setStatus((data.status as EssayStatus) || 'not_started')
        setNotes(data.notes || '')
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [uid])

  const persist = (s: EssayStatus, n: string) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await updatePersonalStatement(uid, { status: s, notes: n })
      } catch {
        toast.error('Failed to save')
      }
    }, 600)
  }

  if (!loaded) return null

  return (
    <Card className="p-4 mb-6 border-beacon/30">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-light">Common App Personal Statement</p>
          <p className="text-xs text-muted mt-0.5">650 word limit · The main essay</p>
        </div>
        <Select
          value={status}
          onChange={e => { const s = e.target.value as EssayStatus; setStatus(s); persist(s, notes) }}
          className="w-32 py-1 text-xs"
        >
          {(Object.keys(STATUS_LABELS) as EssayStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Notes</label>
        <textarea
          className="w-full bg-ink border border-border rounded-xl px-3 py-2 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
          rows={2}
          placeholder="Which prompt are you using? Draft notes, ideas…"
          value={notes}
          onChange={e => { const n = e.target.value; setNotes(n); persist(status, n) }}
        />
      </div>
    </Card>
  )
}

function EssayFeedbackModal({ essays, onClose }: { essays: Essay[]; onClose: () => void }) {
  const [selectedEssayId, setSelectedEssayId] = useState<string>('none')
  const [essayText, setEssayText] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedEssay = essays.find(e => e.id === selectedEssayId)

  const handleFeedback = async () => {
    if (!essayText.trim()) return toast.error('Paste your essay first')
    setLoading(true)
    setFeedback('')
    try {
      const promptCtx = selectedEssay
        ? `Prompt: "${selectedEssay.prompt}"${selectedEssay.schoolName ? ` (${selectedEssay.schoolName})` : ''}${selectedEssay.wordLimit ? ` — ${selectedEssay.wordLimit} word limit` : ''}\n\n`
        : ''
      const text = await callGemini({
        contents: [{
          parts: [{
            text: `You are a brutally honest college essay editor. Do not sugarcoat anything. Be direct, specific, and ruthless — like an admissions officer who has read 5,000 essays. If the essay is generic, derivative, or weak, say so plainly and explain exactly why. If there are clichés, name them. If the structure doesn't work, say it. Give concrete, actionable fixes.

Structure your feedback exactly like this (use these exact headers):

VERDICT
[1-2 sentences, brutally honest overall assessment]

WHAT'S NOT WORKING
[Numbered list of specific problems. Be direct.]

WHAT ACTUALLY WORKS
[Honest strengths only — skip this section if there are none worth mentioning]

CONCRETE FIXES
[Numbered list of specific, actionable changes the student should make]

${promptCtx}Essay:
"""
${essayText.trim()}
"""`,
          }],
        }],
      })
      setFeedback(text)
    } catch {
      toast.error('Feedback failed')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-2xl border border-border w-full max-w-2xl shadow-card mb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-light">Essay Feedback</h2>
            <p className="text-xs text-muted mt-0.5">Paste your draft — get blunt, honest feedback</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-light"><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Prompt selector */}
          <div>
            <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Prompt (optional — for specific feedback)</label>
            <select
              value={selectedEssayId}
              onChange={e => setSelectedEssayId(e.target.value)}
              className="w-full bg-ink border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40"
            >
              <option value="none">No specific prompt (general feedback)</option>
              {essays.map(e => (
                <option key={e.id} value={e.id}>
                  {e.schoolName ? `${e.schoolName} — ` : 'Common App — '}{e.prompt.slice(0, 80)}{e.prompt.length > 80 ? '…' : ''}
                </option>
              ))}
            </select>
            {selectedEssay && (
              <p className="text-xs text-muted mt-1.5 px-1 leading-relaxed">{selectedEssay.prompt}</p>
            )}
          </div>

          {/* Essay paste area */}
          <div>
            <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Your Essay Draft</label>
            <textarea
              className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40 font-mono leading-relaxed"
              rows={12}
              placeholder="Paste your essay here…"
              value={essayText}
              onChange={e => setEssayText(e.target.value)}
            />
            {essayText.trim() && (
              <p className="text-xs text-muted mt-1 px-1">
                {essayText.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            )}
          </div>

          <Button onClick={handleFeedback} loading={loading} disabled={!essayText.trim()}>
            {!loading && <Sparkles size={14} />}
            {loading ? 'Getting feedback…' : 'Get Blunt Feedback'}
          </Button>

          {/* Feedback output */}
          {feedback && (
            <div className="bg-ink border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-beacon uppercase tracking-wide mb-3">Feedback</p>
              <div className="text-sm text-body leading-relaxed whitespace-pre-wrap">{feedback}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function EssaysPage() {
  const { user } = useAuth()
  const { essays, loading, add, update, remove } = useEssays()
  const [searchText, setSearchText] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortMode, setSortMode] = useState<SortMode>('school')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showAdd, setShowAdd] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [wordLimit, setWordLimit] = useState('')
  const [school, setSchool] = useState('')
  const [deadline, setDeadline] = useState('')

  const sources = useMemo(() => {
    const names = new Set<string>()
    for (const e of essays) { if (e.schoolName) names.add(e.schoolName) }
    return ['All', 'Common App', ...Array.from(names).sort()]
  }, [essays])

  const filtered = useMemo(() => {
    const result = essays.filter(e => {
      const source = e.schoolName ?? null
      if (sourceFilter === 'Common App' && source !== null) return false
      if (sourceFilter !== 'All' && sourceFilter !== 'Common App' && source !== sourceFilter) return false
      if (categoryFilter !== 'All') {
        const cat = e.category ?? 'Other'
        if (categoryFilter === 'Other') {
          if (['Community/Diversity', 'Intellectual Curiosity', 'Short Answer', 'Why School'].includes(cat)) return false
        } else if (cat !== categoryFilter) return false
      }
      if (searchText.trim() && !e.prompt.toLowerCase().includes(searchText.toLowerCase())) return false
      return true
    })
    if (sortMode === 'priority') {
      return [...result].sort((a, b) => priorityScore(b) - priorityScore(a))
    }
    return result
  }, [essays, sourceFilter, categoryFilter, searchText, sortMode])

  const grouped = useMemo(() => {
    if (sortMode === 'priority') return null
    const map = new Map<string, Essay[]>()
    for (const essay of filtered) {
      const key = essay.schoolName || '__common__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(essay)
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === '__common__') return 1
      if (b === '__common__') return -1
      return a.localeCompare(b)
    })
  }, [filtered, sortMode])

  const handleAdd = async () => {
    if (!prompt.trim() || !user) return
    await add({
      userId: user.uid,
      prompt,
      wordLimit: wordLimit ? parseInt(wordLimit) : undefined,
      schoolName: school || undefined,
      deadline: deadline || undefined,
      status: 'not_started',
    })
    setPrompt(''); setWordLimit(''); setSchool(''); setDeadline('')
    setShowAdd(false)
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl text-light">Essays</h1>
          <p className="text-sm text-muted mt-0.5">{essays.length} prompt{essays.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-beacon-dim text-beacon' : 'text-muted hover:text-light'}`}
              title="List view"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('clusters')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'clusters' ? 'bg-beacon-dim text-beacon' : 'text-muted hover:text-light'}`}
              title="Cluster view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFeedback(true)}>
            <MessageSquare size={13} /> Essay Feedback
          </Button>
          <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Prompt</Button>
        </div>
      </div>

      {user && <PersonalStatementCard uid={user.uid} />}

      {!loading && essays.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                placeholder="Search prompts…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl pl-3 pr-8 py-2 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all shrink-0"
            >
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl pl-3 pr-8 py-2 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all shrink-0"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as SortMode)}
              className="bg-surface border border-border rounded-xl pl-3 pr-8 py-2 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all shrink-0"
            >
              <option value="school">By School</option>
              <option value="priority">By Priority</option>
            </select>
          </div>
          <p className="text-xs text-muted mt-2 px-1">
            Showing {filtered.length} of {essays.length} prompt{essays.length !== 1 ? 's' : ''}
            <span className="ml-2 text-beacon/70">· Click <Sparkles size={10} className="inline" /> on any prompt for AI tips</span>
          </p>
        </div>
      )}

      {showAdd && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24 px-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-card p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-light mb-4">Add Essay Prompt</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Prompt</label>
                <textarea
                  className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
                  rows={3}
                  placeholder="Describe a challenge you've overcome..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="School (optional)" placeholder="Common App" value={school} onChange={e => setSchool(e.target.value)} />
                <Input label="Word limit" placeholder="650" type="number" value={wordLimit} onChange={e => setWordLimit(e.target.value)} />
              </div>
              <Input label="Deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              <div className="flex gap-2 mt-1">
                <Button onClick={handleAdd} className="flex-1">Add prompt</Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showFeedback && (
        <EssayFeedbackModal essays={essays} onClose={() => setShowFeedback(false)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : essays.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted text-sm mb-4">No essay prompts yet.</p>
          <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Prompt</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">No essays match these filters.</p>
      ) : viewMode === 'clusters' ? (
        <ClustersView essays={filtered} />
      ) : grouped ? (
        <div>
          {grouped.map(([key, group]) => (
            <SchoolGroup
              key={key}
              label={key === '__common__' ? 'Common App / Universal' : key}
              essays={group}
              update={update}
              remove={remove}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map(essay => (
            <EssayCard key={essay.id} essay={essay} update={update} remove={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
