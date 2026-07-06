import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useEssays } from '@/hooks/useEssays'
import { useAuth } from '@/context/AuthContext'
import { Card, Button, Input, Select, Spinner } from '@/components/ui'
import type { Essay, EssayStatus } from '@/types'

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

function categoryBadgeClass(cat?: string | null): string {
  switch (cat) {
    case 'Community/Diversity': return 'bg-purple-500/10 text-purple-400'
    case 'Intellectual Curiosity': return 'bg-beacon-dim text-beacon'
    case 'Short Answer': return 'bg-border text-muted'
    case 'Why School': return 'bg-warn/10 text-warn'
    default: return 'bg-border text-muted'
  }
}

interface EssayCardProps {
  essay: Essay
  update: (id: string, data: Partial<Essay>) => Promise<void>
  remove: (id: string) => Promise<void>
}

function EssayCard({ essay, update, remove }: EssayCardProps) {
  const [expanded, setExpanded] = useState(false)
  const wordLimit = essay.wordLimit ?? 0

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-beacon/20 transition-colors group">
      {/* Left: prompt + badges */}
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
          {essay.deadline && (
            <span className="text-xs text-muted">Due {new Date(essay.deadline).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Right: status + delete */}
      <div className="flex items-center gap-2 shrink-0">
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
  )
}

interface GroupProps {
  label: string
  essays: Essay[]
  update: (id: string, data: Partial<Essay>) => Promise<void>
  remove: (id: string) => Promise<void>
}

function EssayGroup({ label, essays, update, remove }: GroupProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 mb-2 group"
      >
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

export function EssaysPage() {
  const { user } = useAuth()
  const { essays, loading, add, update, remove } = useEssays()
  const [searchText, setSearchText] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [wordLimit, setWordLimit] = useState('')
  const [school, setSchool] = useState('')
  const [deadline, setDeadline] = useState('')

  const sources = useMemo(() => {
    const names = new Set<string>()
    for (const e of essays) {
      if (e.schoolName) names.add(e.schoolName)
    }
    return ['All', 'Common App', ...Array.from(names).sort()]
  }, [essays])

  const filtered = useMemo(() => {
    return essays.filter(e => {
      const source = e.schoolName ?? null
      if (sourceFilter === 'Common App' && source !== null) return false
      if (sourceFilter !== 'All' && sourceFilter !== 'Common App' && source !== sourceFilter) return false
      if (categoryFilter !== 'All') {
        const cat = e.category ?? 'Other'
        if (categoryFilter === 'Other') {
          if (['Community/Diversity', 'Intellectual Curiosity', 'Short Answer', 'Why School'].includes(cat)) return false
        } else if (cat !== categoryFilter) return false
      }
      if (searchText.trim()) {
        if (!e.prompt.toLowerCase().includes(searchText.toLowerCase())) return false
      }
      return true
    })
  }, [essays, sourceFilter, categoryFilter, searchText])

  const grouped = useMemo(() => {
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
  }, [filtered])

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
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Prompt</Button>
      </div>

      {/* Filter row */}
      {!loading && essays.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                placeholder="Search prompts…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all"
              />
            </div>
            {/* Source */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all shrink-0"
            >
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Category */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40 transition-all shrink-0"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted mt-2 px-1">
            Showing {filtered.length} of {essays.length} prompt{essays.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Add modal */}
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

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : essays.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted text-sm mb-4">No essay prompts yet.</p>
          <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Prompt</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">No essays match these filters.</p>
      ) : (
        <div>
          {grouped.map(([key, group]) => (
            <EssayGroup
              key={key}
              label={key === '__common__' ? 'Common App / Universal' : key}
              essays={group}
              update={update}
              remove={remove}
            />
          ))}
        </div>
      )}
    </div>
  )
}
