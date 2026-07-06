import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import type { Activity, Honor } from '@/types'
import toast from 'react-hot-toast'

interface ParsedResult {
  activities: Activity[]
  honors: Honor[]
}

interface Props {
  onImport: (activities: Activity[], honors: Honor[]) => void
}

const SYSTEM_PROMPT = `You are a college application assistant. Parse the following resume text and extract activities and honors. Return ONLY valid JSON with this exact structure:
{
  "activities": [
    {
      "type": "Club",
      "organization": "Math Club",
      "role": "President",
      "description": "Led weekly competitions and organized regional math olympiad.",
      "grades": [10, 11, 12],
      "hoursPerWeek": 3,
      "weeksPerYear": 36,
      "continueInCollege": true,
      "timing": "School year"
    }
  ],
  "honors": [
    {
      "title": "National Merit Semifinalist",
      "grades": [11],
      "level": "National",
      "description": ""
    }
  ]
}
Only include activities and honors you find clear evidence for. Do not invent data. Activity type must be one of: Club, Sport, Work, Volunteer, Research, Internship, Arts, Other. Honor level must be one of: School, Regional, State, National, International. Timing must be: School year, Summer, or Both.`

export function ResumeImporter({ onImport }: Props) {
  const [open, setOpen] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [selectedActs, setSelectedActs] = useState<Set<number>>(new Set())
  const [selectedHons, setSelectedHons] = useState<Set<number>>(new Set())

  const resetModal = () => {
    setResumeText('')
    setParsed(null)
    setSelectedActs(new Set())
    setSelectedHons(new Set())
    setParsing(false)
  }

  const handleClose = () => {
    setOpen(false)
    resetModal()
  }

  const handleParse = async () => {
    if (!resumeText.trim()) return toast.error('Paste your resume text first')
    const key = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!key) return toast.error('VITE_ANTHROPIC_API_KEY not set in .env')

    setParsing(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: resumeText }],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`API error ${res.status}: ${err}`)
      }

      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')

      const result = JSON.parse(jsonMatch[0]) as ParsedResult
      setParsed(result)
      // Pre-select all
      setSelectedActs(new Set(result.activities.map((_, i) => i)))
      setSelectedHons(new Set(result.honors.map((_, i) => i)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Parsing failed')
    } finally {
      setParsing(false)
    }
  }

  const toggleAct = (i: number) => setSelectedActs(prev => {
    const s = new Set(prev)
    s.has(i) ? s.delete(i) : s.add(i)
    return s
  })

  const toggleHon = (i: number) => setSelectedHons(prev => {
    const s = new Set(prev)
    s.has(i) ? s.delete(i) : s.add(i)
    return s
  })

  const handleImport = () => {
    if (!parsed) return
    const acts = parsed.activities.filter((_, i) => selectedActs.has(i))
    const hons = parsed.honors.filter((_, i) => selectedHons.has(i))
    onImport(acts, hons)
    toast.success(`Imported ${acts.length} activities, ${hons.length} honors`)
    handleClose()
  }

  const totalSelected = selectedActs.size + selectedHons.size

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload size={13} /> Import from Resume
      </Button>

      {open && createPortal(
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto"
          onClick={handleClose}
        >
          <div
            className="bg-surface rounded-2xl border border-border w-full max-w-2xl shadow-card mb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-semibold text-light">Import from Resume</h2>
                <p className="text-xs text-muted mt-0.5">Paste your resume and AI will extract activities & honors</p>
              </div>
              <button onClick={handleClose} className="text-muted hover:text-light"><X size={16} /></button>
            </div>

            <div className="p-6">
              {!parsed ? (
                /* Paste panel */
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-body uppercase tracking-wide block mb-1.5">
                      Resume Text
                    </label>
                    <textarea
                      className="w-full bg-ink border border-border rounded-xl px-3 py-3 text-sm text-light placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-beacon/40 font-mono"
                      rows={12}
                      placeholder="Paste your full resume text here…"
                      value={resumeText}
                      onChange={e => setResumeText(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleParse} loading={parsing} className="flex-1">
                      {!parsing && <Sparkles size={14} />}
                      {parsing ? 'Parsing…' : 'Parse with AI'}
                    </Button>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                  </div>
                </div>
              ) : (
                /* Preview panel */
                <div className="flex flex-col gap-5">
                  {parsed.activities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                        Activities ({parsed.activities.length})
                      </p>
                      <div className="flex flex-col gap-2">
                        {parsed.activities.map((a, i) => (
                          <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-beacon/30 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedActs.has(i)}
                              onChange={() => toggleAct(i)}
                              className="mt-0.5 accent-beacon"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-light">{a.organization}</p>
                              <p className="text-xs text-muted">{a.role} · {a.type} · {a.hoursPerWeek}h/wk</p>
                              {a.description && (
                                <p className="text-xs text-body mt-0.5 line-clamp-2">{a.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsed.honors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                        Honors ({parsed.honors.length})
                      </p>
                      <div className="flex flex-col gap-2">
                        {parsed.honors.map((h, i) => (
                          <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-beacon/30 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedHons.has(i)}
                              onChange={() => toggleHon(i)}
                              className="mt-0.5 accent-beacon"
                            />
                            <div>
                              <p className="text-sm font-medium text-light">{h.title}</p>
                              <p className="text-xs text-muted">{h.level} · Grade{h.grades.length !== 1 ? 's' : ''} {h.grades.join(', ')}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsed.activities.length === 0 && parsed.honors.length === 0 && (
                    <p className="text-sm text-muted text-center py-6">No activities or honors found in the resume.</p>
                  )}

                  <div className="flex gap-3 pt-2 border-t border-border">
                    <Button
                      onClick={handleImport}
                      disabled={totalSelected === 0}
                      className="flex-1"
                    >
                      Import {totalSelected} item{totalSelected !== 1 ? 's' : ''}
                    </Button>
                    <Button variant="ghost" onClick={() => setParsed(null)}>
                      Re-paste
                    </Button>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
