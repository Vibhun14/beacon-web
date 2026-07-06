import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Mail } from 'lucide-react'
import { useLORs } from '@/hooks/useLORs'
import { useAuth } from '@/context/AuthContext'
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui'
import type { LORStatus } from '@/types'

const STATUS_LABELS: Record<LORStatus, string> = {
  not_asked: 'Not Asked',
  asked: 'Asked',
  confirmed: 'Confirmed',
  submitted: 'Submitted',
}

const STATUS_COLOR: Record<LORStatus, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  not_asked: 'gray',
  asked: 'yellow',
  confirmed: 'blue',
  submitted: 'green',
}

export function LORsPage() {
  const { user } = useAuth()
  const { lors, loading, add, update, remove } = useLORs()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('')
  const [deadline, setDeadline] = useState('')

  const handleAdd = async () => {
    if (!name.trim() || !user) return
    await add({
      userId: user.uid,
      recommenderName: name,
      recommenderTitle: title || undefined,
      recommenderEmail: email || undefined,
      relationship,
      deadline: deadline || undefined,
      status: 'not_asked',
      schoolIds: [],
    })
    setName('')
    setTitle('')
    setEmail('')
    setRelationship('')
    setDeadline('')
    setShowAdd(false)
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-light">Recommendations</h1>
          <p className="text-sm text-muted mt-0.5">{lors.length} recommender{lors.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Recommender</Button>
      </div>

      {showAdd && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24 px-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-card p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-light mb-4">Add Recommender</h2>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name" placeholder="Dr. Smith" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Title" placeholder="AP Physics Teacher" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email" type="email" placeholder="smith@school.edu" value={email} onChange={e => setEmail(e.target.value)} />
                <Input label="Relationship" placeholder="Teacher, Mentor, Employer" value={relationship} onChange={e => setRelationship(e.target.value)} />
              </div>
              <Input label="Deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              <div className="flex gap-2 mt-1">
                <Button onClick={handleAdd} className="flex-1">Add recommender</Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : lors.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted text-sm mb-4">No recommenders tracked yet.</p>
          <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add Recommender</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {lors.map(lor => (
            <Card key={lor.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-beacon-dim flex items-center justify-center text-beacon shrink-0">
                <Mail size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-light">{lor.recommenderName}</p>
                <p className="text-xs text-muted">{lor.recommenderTitle}{lor.relationship ? ` · ${lor.relationship}` : ''}</p>
                {lor.deadline && (
                  <p className="text-xs text-muted mt-0.5">Deadline {new Date(lor.deadline).toLocaleDateString()}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Select
                  value={lor.status}
                  onChange={e => update(lor.id, { status: e.target.value as LORStatus })}
                  className="w-32 py-1.5 text-xs"
                >
                  {(Object.keys(STATUS_LABELS) as LORStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </Select>
                <Badge color={STATUS_COLOR[lor.status]}>{STATUS_LABELS[lor.status]}</Badge>
                <button onClick={() => remove(lor.id, lor.recommenderName)} className="text-muted hover:text-danger transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
