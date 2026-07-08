import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Mail, Sparkles, Copy, Check } from 'lucide-react'
import { useLORs } from '@/hooks/useLORs'
import { useAuth } from '@/context/AuthContext'
import { callGemini } from '@/lib/gemini'
import { Card, Button, Input, Select, Badge, Spinner } from '@/components/ui'
import type { LOR, LORStatus } from '@/types'
import toast from 'react-hot-toast'

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

const TIMELINE_STEPS: LORStatus[] = ['not_asked', 'asked', 'confirmed', 'submitted']

function LORTimeline({ status }: { status: LORStatus }) {
  const currentIdx = TIMELINE_STEPS.indexOf(status)
  return (
    <div className="flex items-start w-full mt-3 pt-3 border-t border-border">
      {TIMELINE_STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${i <= currentIdx ? 'bg-beacon border-beacon' : 'bg-transparent border-border'}`} />
            <span className={`text-[10px] whitespace-nowrap leading-none ${i <= currentIdx ? 'text-beacon' : 'text-muted'}`}>{STATUS_LABELS[step]}</span>
          </div>
          {i < TIMELINE_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${i < currentIdx ? 'bg-beacon' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export function LORsPage() {
  const { user } = useAuth()
  const { lors, loading, add, update, remove } = useLORs()

  // Add recommender form
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('')
  const [deadline, setDeadline] = useState('')

  // Email drafter
  const [draftLOR, setDraftLOR] = useState<LOR | null>(null)
  const [draftStep, setDraftStep] = useState<1 | 2>(1)
  const [draftContext, setDraftContext] = useState('')
  const [draftMemory, setDraftMemory] = useState('')
  const [draftQuality, setDraftQuality] = useState('')
  const [draftAchievements, setDraftAchievements] = useState('')
  const [draftMajor, setDraftMajor] = useState('')
  const [draftTone, setDraftTone] = useState<'formal' | 'warm' | 'casual'>('warm')
  const [drafting, setDrafting] = useState(false)
  const [draftResult, setDraftResult] = useState<{ subject: string; body: string } | null>(null)
  const [copied, setCopied] = useState(false)

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
    setName(''); setTitle(''); setEmail(''); setRelationship(''); setDeadline('')
    setShowAdd(false)
  }

  const openDrafter = (lor: LOR) => {
    setDraftLOR(lor)
    setDraftStep(1)
    setDraftContext('')
    setDraftMemory('')
    setDraftQuality('')
    setDraftAchievements('')
    setDraftMajor('')
    setDraftTone('warm')
    setDraftResult(null)
    setCopied(false)
  }

  const handleDraft = async () => {
    if (!draftLOR) return
    setDrafting(true)
    try {
      const promptText = `You are a college application assistant. Draft a polite, personalized letter of recommendation request email from a high school student to their recommender.

Student info:
- Intended major: ${draftMajor || 'undecided'}
- Tone preference: ${draftTone}

Recommender info:
- Name: ${draftLOR.recommenderName}
- Title: ${draftLOR.recommenderTitle || 'Teacher/Mentor'}
- Relationship: ${draftLOR.relationship}

How the student knows this person: ${draftContext || 'not specified'}
Specific memory or project to mention: ${draftMemory || 'none specified'}
Key quality the student wants highlighted: ${draftQuality || 'general excellence'}
Achievements or projects the recommender witnessed: ${draftAchievements || 'not specified'}

Return ONLY valid JSON (no markdown, no code fences):
{
  "subject": "Letter of Recommendation Request",
  "body": "Dear ${draftLOR.recommenderName},\\n\\n..."
}
Requirements:
- Tone must be ${draftTone}
- Include the specific memory or context if provided
- Clearly state purpose (college applications)
- Be concise (150-250 words)
- End with "[Your Name]" as placeholder`

      const text = await callGemini({ contents: [{ parts: [{ text: promptText }] }] })
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      setDraftResult(JSON.parse(jsonMatch[0]) as { subject: string; body: string })
      setDraftStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Draft generation failed')
    } finally {
      setDrafting(false)
    }
  }

  const handleCopy = () => {
    if (!draftResult) return
    const full = `Subject: ${draftResult.subject}\n\n${draftResult.body}`
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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

      {/* Add modal */}
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

      {/* Email drafter modal */}
      {draftLOR && createPortal(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto" onClick={() => setDraftLOR(null)}>
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-card mb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-semibold text-light">Draft Request Email</h2>
                <p className="text-xs text-muted mt-0.5">For {draftLOR.recommenderName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Step {draftStep}/2</span>
                <button onClick={() => setDraftLOR(null)} className="text-muted hover:text-light ml-2">✕</button>
              </div>
            </div>

            <div className="p-6">
              {draftStep === 1 ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">How do you know this person?</label>
                    <textarea
                      className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
                      rows={2}
                      placeholder="e.g. She was my AP Chemistry teacher junior year, I stayed after class often..."
                      value={draftContext}
                      onChange={e => setDraftContext(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Specific memory or project</label>
                    <textarea
                      className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
                      rows={2}
                      placeholder="e.g. The research project on enzyme kinetics we presented at the state fair..."
                      value={draftMemory}
                      onChange={e => setDraftMemory(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Key quality to highlight</label>
                      <input
                        className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40"
                        placeholder="e.g. Scientific curiosity"
                        value={draftQuality}
                        onChange={e => setDraftQuality(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Intended major</label>
                      <input
                        className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-beacon/40"
                        placeholder="e.g. Biomedical Engineering"
                        value={draftMajor}
                        onChange={e => setDraftMajor(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Key achievements they witnessed</label>
                    <textarea
                      className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40"
                      rows={2}
                      placeholder="e.g. Won first place at Science Olympiad, highest grade in class..."
                      value={draftAchievements}
                      onChange={e => setDraftAchievements(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Tone</label>
                    <select
                      value={draftTone}
                      onChange={e => setDraftTone(e.target.value as 'formal' | 'warm' | 'casual')}
                      className="w-full bg-ink border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm text-light focus:outline-none focus:ring-2 focus:ring-beacon/40"
                    >
                      <option value="warm">Warm</option>
                      <option value="formal">Formal</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleDraft} loading={drafting} className="flex-1">
                      {!drafting && <Sparkles size={14} />}
                      {drafting ? 'Generating…' : 'Generate Email'}
                    </Button>
                    <Button variant="ghost" onClick={() => setDraftLOR(null)}>Cancel</Button>
                  </div>
                </div>
              ) : draftResult ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Subject</label>
                    <div className="bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light">
                      {draftResult.subject}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">Email Body</label>
                    <textarea
                      className="w-full bg-ink border border-border rounded-xl px-3 py-2.5 text-sm text-light resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40 font-mono leading-relaxed"
                      rows={12}
                      value={draftResult.body}
                      onChange={e => setDraftResult(r => r ? { ...r, body: e.target.value } : r)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCopy} className="flex-1">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy Email'}
                    </Button>
                    <Button variant="ghost" onClick={() => setDraftStep(1)}>Regenerate</Button>
                    <Button variant="ghost" onClick={() => setDraftLOR(null)}>Done</Button>
                  </div>
                </div>
              ) : null}
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
            <Card key={lor.id} className="px-5 py-4">
              <div className="flex items-center gap-4">
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
                  <button
                    onClick={() => openDrafter(lor)}
                    title="Draft request email"
                    className="text-muted hover:text-beacon transition-colors"
                  >
                    <Sparkles size={14} />
                  </button>
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
              </div>
              <LORTimeline status={lor.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
