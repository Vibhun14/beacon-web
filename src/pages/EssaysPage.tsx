import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useEssays } from '@/hooks/useEssays'
import { useAuth } from '@/context/AuthContext'
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui'
import type { EssayStatus } from '@/types'

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

export function EssaysPage() {
  const { user } = useAuth()
  const { essays, loading, add, update, remove } = useEssays()
  const [showAdd, setShowAdd] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [wordLimit, setWordLimit] = useState('')
  const [school, setSchool] = useState('')
  const [deadline, setDeadline] = useState('')

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
        <div className="flex flex-col gap-3">
          {essays.map(essay => (
            <Card key={essay.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {essay.schoolName && <span className="text-xs font-medium text-beacon">{essay.schoolName}</span>}
                    {essay.wordLimit && <span className="text-xs text-muted">{essay.wordLimit} words</span>}
                    {essay.deadline && (
                      <span className="text-xs text-muted">
                        Due {new Date(essay.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-light leading-relaxed">{essay.prompt}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                  <button onClick={() => remove(essay.id)} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
