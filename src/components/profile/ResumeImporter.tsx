import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Upload, X, Sparkles, FileText } from 'lucide-react'
import { Button } from '@/components/ui'
import { callGemini } from '@/lib/gemini'
import type { Activity, Honor } from '@/types'
import toast from 'react-hot-toast'

interface ParsedResult {
  activities: Activity[]
  honors: Honor[]
}

interface Props {
  onImport: (activities: Activity[], honors: Honor[]) => void
}

const PARSE_PROMPT = `You are a college application assistant. Parse this resume PDF and extract activities and honors. Return ONLY valid JSON with this exact structure (no markdown, no code fences):
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

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ResumeImporter({ onImport }: Props) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [selectedActs, setSelectedActs] = useState<Set<number>>(new Set())
  const [selectedHons, setSelectedHons] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetModal = () => {
    setFile(null)
    setParsed(null)
    setSelectedActs(new Set())
    setSelectedHons(new Set())
    setParsing(false)
  }

  const handleClose = () => { setOpen(false); resetModal() }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleParse = async () => {
    if (!file) return toast.error('Select a PDF resume first')
    setParsing(true)
    try {
      const base64 = await toBase64(file)
      const text = await callGemini({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: base64 } },
            { text: PARSE_PROMPT },
          ]
        }]
      })
      const raw = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const result = JSON.parse(jsonMatch[0]) as ParsedResult
      setParsed(result)
      setSelectedActs(new Set(result.activities.map((_, i) => i)))
      setSelectedHons(new Set(result.honors.map((_, i) => i)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Parsing failed')
    } finally {
      setParsing(false)
    }
  }

  const toggleAct = (i: number) => setSelectedActs(prev => {
    const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s
  })
  const toggleHon = (i: number) => setSelectedHons(prev => {
    const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitizeActivity = (a: any): Activity => ({
    type: a.type ?? 'Other',
    organization: a.organization ?? '',
    role: a.role ?? '',
    description: a.description ?? '',
    grades: a.grades ?? [],
    hoursPerWeek: a.hoursPerWeek ?? 0,
    weeksPerYear: a.weeksPerYear ?? 0,
    continueInCollege: a.continueInCollege ?? false,
    timing: a.timing ?? 'School year',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitizeHonor = (h: any): Honor => ({
    title: h.title ?? '',
    grades: h.grades ?? [],
    level: h.level ?? 'School',
    description: h.description ?? '',
  })

  const handleImport = () => {
    if (!parsed) return
    const acts = parsed.activities.filter((_, i) => selectedActs.has(i)).map(sanitizeActivity)
    const hons = parsed.honors.filter((_, i) => selectedHons.has(i)).map(sanitizeHonor)
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
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-semibold text-light">Import from Resume</h2>
                <p className="text-xs text-muted mt-0.5">Upload your PDF resume and AI will extract activities & honors</p>
              </div>
              <button onClick={handleClose} className="text-muted hover:text-light"><X size={16} /></button>
            </div>

            <div className="p-6">
              {!parsed ? (
                <div className="flex flex-col gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-beacon/40 rounded-xl p-10 flex flex-col items-center gap-3 transition-colors group"
                  >
                    <FileText size={32} className="text-muted group-hover:text-beacon transition-colors" />
                    {file ? (
                      <div className="text-center">
                        <p className="text-sm font-medium text-light">{file.name}</p>
                        <p className="text-xs text-muted mt-0.5">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-muted">Click to select a PDF resume</p>
                        <p className="text-xs text-muted mt-0.5">PDF files only</p>
                      </div>
                    )}
                  </button>
                  <div className="flex gap-3">
                    <Button onClick={handleParse} loading={parsing} disabled={!file} className="flex-1">
                      {!parsing && <Sparkles size={14} />}
                      {parsing ? 'Parsing with AI…' : 'Parse with AI'}
                    </Button>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {parsed.activities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                        Activities ({parsed.activities.length})
                      </p>
                      <div className="flex flex-col gap-2">
                        {parsed.activities.map((a, i) => (
                          <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-beacon/30 cursor-pointer transition-colors">
                            <input type="checkbox" checked={selectedActs.has(i)} onChange={() => toggleAct(i)} className="mt-0.5 accent-beacon" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-light">{a.organization}</p>
                              <p className="text-xs text-muted">{a.role} · {a.type} · {a.hoursPerWeek}h/wk</p>
                              {a.description && <p className="text-xs text-body mt-0.5 line-clamp-2">{a.description}</p>}
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
                            <input type="checkbox" checked={selectedHons.has(i)} onChange={() => toggleHon(i)} className="mt-0.5 accent-beacon" />
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
                    <Button onClick={handleImport} disabled={totalSelected === 0} className="flex-1">
                      Import {totalSelected} item{totalSelected !== 1 ? 's' : ''}
                    </Button>
                    <Button variant="ghost" onClick={() => { setParsed(null); setFile(null) }}>Re-upload</Button>
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
