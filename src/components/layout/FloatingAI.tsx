import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { callGemini } from '@/lib/gemini'
import { useProfile } from '@/context/ProfileContext'
import toast from 'react-hot-toast'

interface Msg { role: 'user' | 'ai'; text: string }

const CHIPS = [
  'How can I strengthen my college list?',
  'What makes a great common app essay?',
  'When should I ask for recommendations?',
  'How important are extracurriculars?',
]

export function FloatingAI() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const { profile } = useProfile()

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const next: Msg[] = [...msgs, { role: 'user', text: msg }]
    setMsgs(next)
    setLoading(true)
    try {
      const ctx = [
        `You are Beacon, a friendly and concise college admissions counselor. Answer in 2-3 short paragraphs max.`,
        profile
          ? `Student context: GPA ${profile.gpa ?? '?'}, SAT ${profile.sat ?? '?'}, ACT ${profile.act ?? '?'}, state ${profile.state ?? '?'}, major ${profile.intendedMajor ?? 'undecided'}, graduating ${profile.graduationYear ?? '?'}.`
          : '',
        ...next.map(m => `${m.role === 'user' ? 'Student' : 'Beacon'}: ${m.text}`),
      ].filter(Boolean).join('\n')
      const reply = await callGemini({ contents: [{ parts: [{ text: ctx }] }] })
      setMsgs(prev => [...prev, { role: 'ai', text: reply }])
    } catch {
      toast.error('AI response failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
      {/* Chat panel */}
      {open && (
        <div
          style={{
            width: '340px',
            maxHeight: '480px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={15} color="#5B8AF0" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-light)' }}>Ask Beacon AI</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '2px' }}>
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {msgs.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>Ask anything about your college application:</p>
                {CHIPS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => send(c)}
                    style={{
                      background: 'var(--color-beacon-dim)',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      color: '#5B8AF0',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: m.role === 'user' ? '#5B8AF0' : 'var(--color-ink)',
                    color: m.role === 'user' ? '#ffffff' : 'var(--color-body)',
                    border: m.role === 'ai' ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '12px', background: 'var(--color-ink)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderTop: '1px solid var(--color-border)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask a question…"
              style={{
                flex: 1,
                background: 'var(--color-ink)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--color-light)',
                outline: 'none',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                background: '#5B8AF0',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 10px',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !loading ? 1 : 0.4,
                display: 'flex',
                alignItems: 'center',
                color: '#fff',
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          borderRadius: '20px',
          background: open ? 'var(--color-surface)' : '#5B8AF0',
          color: open ? '#5B8AF0' : '#ffffff',
          border: open ? '1px solid rgba(91,138,240,0.4)' : 'none',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <Sparkles size={15} />
        {open ? 'Close AI' : 'Ask Beacon AI'}
      </button>
    </div>
  )
}
