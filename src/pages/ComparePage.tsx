import { useMemo, useState } from 'react'
import { GitCompare } from 'lucide-react'
import { useSchools } from '@/hooks/useSchools'
import { Card, Select, Spinner } from '@/components/ui'
import type { School } from '@/types'

interface Row {
  label: string
  getValue: (s: School) => number | null
  format: (n: number | null) => string
  best: 'min' | 'max'
}

const ROWS: Row[] = [
  { label: 'Ranking', getValue: s => s.ranking ?? null, format: n => n == null ? '—' : `#${n}`, best: 'min' },
  { label: 'Acceptance Rate', getValue: s => s.acceptanceRate ?? null, format: n => n == null ? '—' : `${Math.round(n * 100)}%`, best: 'min' },
  { label: 'SAT Mid-50', getValue: s => s.avgSAT ?? null, format: n => n == null ? '—' : String(n), best: 'max' },
  { label: 'ACT Mid-50', getValue: s => s.avgACT ?? null, format: n => n == null ? '—' : String(n), best: 'max' },
  { label: 'In-State Tuition', getValue: s => s.inStateTuition ?? null, format: n => n == null ? '—' : `$${n.toLocaleString()}`, best: 'min' },
  { label: 'Out-of-State Tuition', getValue: s => s.outStateTuition ?? null, format: n => n == null ? '—' : `$${n.toLocaleString()}`, best: 'min' },
  { label: 'Average Aid', getValue: s => s.averageAid ?? null, format: n => n == null ? '—' : `$${n.toLocaleString()}`, best: 'max' },
  { label: 'Est. Net Cost', getValue: s => (s.outStateTuition != null && s.averageAid != null) ? s.outStateTuition - s.averageAid : null, format: n => n == null ? '—' : `$${n.toLocaleString()}`, best: 'min' },
  { label: 'Enrollment', getValue: s => s.enrollment ?? null, format: n => n == null ? '—' : n.toLocaleString(), best: 'max' },
  { label: 'Avg Starting Salary', getValue: s => s.averageStartingSalary ?? null, format: n => n == null ? '—' : `$${n.toLocaleString()}`, best: 'max' },
]

export function ComparePage() {
  const { schools, loading } = useSchools()
  const [selected, setSelected] = useState<string[]>(['', '', ''])

  const chosen = useMemo(
    () => selected.map(id => schools.find(s => s.id === id) ?? null),
    [selected, schools]
  )

  const activeCount = chosen.filter(Boolean).length

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-light">Compare</h1>
        <p className="text-sm text-muted mt-0.5">Side-by-side comparison of up to 3 schools</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : schools.length < 2 ? (
        <Card className="p-10 text-center">
          <GitCompare size={24} className="text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">Add at least 2 schools to compare them.</p>
        </Card>
      ) : (
        <>
          {/* Pickers */}
          <div className="grid gap-3 mb-6 grid-cols-3">
            {[0, 1, 2].map(i => (
              <Select
                key={i}
                label={`School ${i + 1}`}
                value={selected[i]}
                onChange={e => {
                  const next = [...selected]
                  next[i] = e.target.value
                  setSelected(next)
                }}
              >
                <option value="">— pick a school —</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id} disabled={selected.includes(s.id) && selected[i] !== s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            ))}
          </div>

          {/* Comparison table */}
          {activeCount >= 2 && (
            <Card className="overflow-hidden">
              {/* Header row */}
              <div
                className="grid border-b border-border"
                style={{ gridTemplateColumns: `180px repeat(${activeCount}, 1fr)` }}
              >
                <div className="p-4" />
                {chosen.filter((s): s is School => s !== null).map(s => (
                  <div key={s.id} className="p-4 border-l border-border">
                    <p className="font-semibold text-light text-sm">{s.name}</p>
                    <p className="text-xs text-muted mt-0.5">{s.city}, {s.state}</p>
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {ROWS.map((row, ri) => {
                const activeSchools = chosen.filter((s): s is School => s !== null)
                const values = activeSchools.map(s => row.getValue(s))
                const defined = values.filter((v): v is number => v !== null)
                const bestVal = defined.length >= 2
                  ? (row.best === 'min' ? Math.min(...defined) : Math.max(...defined))
                  : null

                return (
                  <div
                    key={row.label}
                    className={`grid border-b border-border last:border-0 ${ri % 2 === 0 ? '' : 'bg-ink/40'}`}
                    style={{ gridTemplateColumns: `180px repeat(${activeCount}, 1fr)` }}
                  >
                    <div className="p-3 px-4 flex items-center">
                      <span className="text-xs text-muted">{row.label}</span>
                    </div>
                    {activeSchools.map((s, si) => {
                      const val = values[si]
                      const isBest = bestVal !== null && val === bestVal
                      return (
                        <div key={s.id} className="p-3 px-4 border-l border-border flex items-center">
                          <span className={`text-sm font-medium ${isBest ? 'text-success' : 'text-light'}`}>
                            {row.format(val)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
