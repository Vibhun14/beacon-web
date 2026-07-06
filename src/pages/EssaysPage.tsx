import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useEssays } from '@/hooks/useEssays'
import { useAuth } from '@/context/AuthContext'
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui'
import type { Essay, EssayStatus } from '@/types'

const STATUS_LABELS: Record<EssayStatus, string> = {
  not_started: 'Not Started',
  drafting: 'Drafting',
  revising: 'Revising',
  final: 'Final',
  submitted: 'Submitted',
}

const STATUS_COLOR: Record<EssayStatus, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  not_started: 'gray',
  drafting: 'yellow',
  revising: 'blue',
  final: 'green',
  submitted: 'green',
}

const CATEGORY_COLOR: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  'Community/Diversity': 'blue',
  'Intellectual Curiosity': 'green',
  'Why School': 'yellow',
  'Extracurricular': 'blue',
  'Personal Statement': 'gray',
  'Additional Info': 'gray',
}

function categoryColor(cat?: string): 'blue' | 'green' | 'yellow' | 'red' | 'gray' {
  return (cat && CATEGORY_COLOR[cat]) ? CATEGORY_COLOR[cat] : 'gray'
}

interface EssayCardProps {
  essay: Essay
  update: (id: string, data: Partial<Essay>) => Promise<void>
  remove: (id: string) => Promise<void>
}

function EssayCard({ essay, update, remove }: EssayCardProps) {
  const pct = essay.wordLimit && essay.wordCount != null
    ? Math.min(100, Math.round((essay.wordCount / essay.wordLimit) * 100))
    : null

  return (
    <Card className="p-5">
      {/* Top row: category badge, word limit badge, deadline */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {essay.category && <Badge color={categoryColor(essay.category)}>{essay.category}</Badge>}
        {essay.wordLimit && <Badge color="gray">{essay.wordLimit}w limit</Badge>}
        {essay.deadline && <span className="text-xs text-muted">Due {new Date(essay.deadline).toLocaleDateString()}</span>}
      </div>

      {/* Prompt */}
      <p className="text-sm text-light leading-relaxed mb-3">{essay.prompt}</p>

      {/* Word count + progress bar */}
      {essay.wordLimit && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs text-muted">Words written:</label>
            <input
              type="number"
              min={0}
              value={essay.wordCount ?? ''}
              onChange={e => update(essay.id, { wordCount: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-16 bg-ink border border-border rounded-lg px-2 py-0.5 text-xs text-light focus:outline-none focus:ring-1 focus:ring-beacon/40"
              placeholder="0"
            />
            <span className="text-xs text-muted">/ {essay.wordLimit}</span>
          </div>
          {pct !== null && (
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-success' : pct >= 80 ? 'bg-warn' : 'bg-beacon'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom row: status select, badge, delete */}
      <div className="flex items-center gap-2">
        <Select
          value={essay.status}
          onChange={e => update(essay.id, { status: e.target.value as EssayStatus })}
          className="w-32 py-1.5 text-xs"
        >
          {(Object.keys(STATUS_LABELS) as EssayStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Badge color={STATUS_COLOR[essay.status]}>{STATUS_LABELS[essay.status]}</Badge>
        <button onClick={() => remove(essay.id)} className="ml-auto text-muted hover:text-danger transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  )
}

export function EssaysPage() {
  const { user } = useAuth()
  const { essays, loading, add, update, remove } = useEssays()
  const [showAdd, setShowAdd] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [wordLimit, setWordLimit] = useState('')
  const [school, setSchool] = useState('')
  const [deadline, setDeadline] = useState('')

  const grouped = useMemo(() => {
    const map = new Map<string, Essay[]>()
    for (const essay of essays) {
      const key = essay.schoolName || '__common__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(essay)
    }
    // Sort: named schools alphabetically, common app last
    const entries = [...map.entries()].sort(([a], [b]) => {
      if (a === '__common__') return 1
      if (b === '__common__') return -1
      return a.localeCompare(b)
    })
    return entries
  }, [essays])

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
    setPrompt('')
    setWordLimit('')
    setSchool('')
    setDeadline('')
    setShowAdd(false)
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-light">Essays</h1>
          <p className="text-sm text-muted mt-0.5">{essays.length} prompt{essays.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Prompt</Button>
      </div>

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
      ) : (
        <div>
          {grouped.map(([key, group]) => (
            <div key={key} className="mb-6">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
                {key === '__common__' ? 'Common App / Other' : key}
              </h2>
              <div className="flex flex-col gap-3">
                {group.map(essay => (
                  <EssayCard key={essay.id} essay={essay} update={update} remove={remove} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
