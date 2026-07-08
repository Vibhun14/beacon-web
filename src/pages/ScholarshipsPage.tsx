import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ExternalLink, DollarSign } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getScholarships, setScholarshipsDoc } from '@/lib/db'
import { Card, Button, Input, Badge, Spinner } from '@/components/ui'
import type { Scholarship, ScholarshipStatus } from '@/types'
import toast from 'react-hot-toast'

const STATUS_LABELS: Record<ScholarshipStatus, string> = {
  not_started: 'Not Started',
  applied: 'Applied',
  awarded: 'Awarded',
  rejected: 'Rejected',
}

const STATUS_COLOR: Record<ScholarshipStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  not_started: 'gray',
  applied: 'blue',
  awarded: 'green',
  rejected: 'red',
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10)
}

export function ScholarshipsPage() {
  const { user } = useAuth()
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Form state
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!user) return
    getScholarships(user.uid).then(data => { setScholarships(data); setLoading(false) }).catch(() => setLoading(false))
  }, [user])

  const persist = (next: Scholarship[]) => {
    setScholarships(next)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!user) return
      try { await setScholarshipsDoc(user.uid, next) }
      catch { toast.error('Failed to save') }
    }, 600)
  }

  const handleAdd = () => {
    if (!name.trim()) return
    const s: Scholarship = {
      id: nanoid(),
      name: name.trim(),
      amount: amount ? parseInt(amount) : undefined,
      deadline: deadline || undefined,
      link: link || undefined,
      notes: notes || undefined,
      status: 'not_started',
    }
    persist([...scholarships, s])
    toast.success(`${s.name} added`)
    setName(''); setAmount(''); setDeadline(''); setLink(''); setNotes('')
    setShowAdd(false)
  }

  const updateStatus = (id: string, status: ScholarshipStatus) => {
    persist(scholarships.map(s => s.id === id ? { ...s, status } : s))
  }

  const remove = (id: string) => {
    const s = scholarships.find(x => x.id === id)
    persist(scholarships.filter(x => x.id !== id))
    if (s) toast.success(`${s.name} removed`)
  }

  const total = scholarships.reduce((sum, s) => sum + (s.amount ?? 0), 0)
  const awarded = scholarships.filter(s => s.status === 'awarded').reduce((sum, s) => sum + (s.amount ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-light">Scholarships</h1>
          <p className="text-sm text-muted mt-0.5">
            {scholarships.length} tracked
            {awarded > 0 && <span className="ml-2 text-success font-medium">${awarded.toLocaleString()} awarded</span>}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Scholarship</Button>
      </div>

      {/* Summary strip */}
      {scholarships.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(['not_started','applied','awarded','rejected'] as ScholarshipStatus[]).map(status => {
            const count = scholarships.filter(s => s.status === status).length
            const amt = scholarships.filter(s => s.status === status).reduce((sum, s) => sum + (s.amount ?? 0), 0)
            return (
              <Card key={status} className="p-4 text-center">
                <p className="text-lg font-bold text-light">{count}</p>
                <p className="text-xs text-muted">{STATUS_LABELS[status]}</p>
                {amt > 0 && <p className="text-xs text-beacon mt-0.5">${amt.toLocaleString()}</p>}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-semibold text-light mb-4">New Scholarship</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input label="Scholarship Name" placeholder="Gates Scholarship" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Amount ($)" type="number" placeholder="10000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input label="Deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            <Input label="Link (optional)" placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Notes</label>
            <textarea
              className="w-full bg-ink border border-border rounded-xl px-3 py-2 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
              rows={2}
              placeholder="Essay requirements, eligibility criteria..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} className="flex-1">Add Scholarship</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : scholarships.length === 0 && !showAdd ? (
        <Card className="p-10 text-center">
          <DollarSign size={24} className="mx-auto text-muted mb-3" />
          <p className="text-muted text-sm mb-4">Track scholarships and fellowships you're applying to.</p>
          <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Scholarship</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {scholarships.map(s => {
            const days = s.deadline ? Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 86400000) : null
            return (
              <Card key={s.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-beacon-dim flex items-center justify-center text-beacon shrink-0">
                  <DollarSign size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-light truncate">{s.name}</p>
                    {s.link && (
                      <a href={s.link} target="_blank" rel="noreferrer" className="text-muted hover:text-beacon shrink-0">
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {s.amount && <span className="text-xs text-beacon font-medium">${s.amount.toLocaleString()}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                    {s.deadline && (
                      <span className={days !== null && days <= 7 ? 'text-danger' : ''}>
                        Due {new Date(s.deadline).toLocaleDateString()}{days !== null && days >= 0 ? ` (${days}d)` : ''}
                      </span>
                    )}
                    {s.notes && <span className="truncate max-w-xs">{s.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={s.status}
                    onChange={e => updateStatus(s.id, e.target.value as ScholarshipStatus)}
                    className="bg-surface border border-border rounded-xl pl-3 pr-8 py-1.5 text-xs text-light focus:outline-none focus:ring-2 focus:ring-beacon/40"
                  >
                    {(Object.keys(STATUS_LABELS) as ScholarshipStatus[]).map(k => (
                      <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                    ))}
                  </select>
                  <Badge color={STATUS_COLOR[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                  <button onClick={() => remove(s.id)} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            )
          })}
          {total > 0 && (
            <p className="text-xs text-muted text-right mt-1">
              Total tracked: <span className="text-light font-medium">${total.toLocaleString()}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
