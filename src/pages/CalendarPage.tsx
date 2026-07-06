import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useSchools } from '@/hooks/useSchools'
import { useEssays } from '@/hooks/useEssays'
import { Spinner } from '@/components/ui'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface DeadlineItem {
  type: 'school' | 'essay'
  name: string
  detail: string
}

export function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const { schools, loading: schoolsLoading } = useSchools()
  const { essays, loading: essaysLoading } = useEssays()
  const loading = schoolsLoading || essaysLoading

  const deadlineMap = useMemo(() => {
    const map = new Map<number, DeadlineItem[]>()

    const add = (dateStr: string | undefined, item: DeadlineItem) => {
      if (!dateStr) return
      // Parse as local date to avoid UTC offset shifting the day
      const [y, m, d] = dateStr.split('-').map(Number)
      if (y !== year || m - 1 !== month) return
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(item)
    }

    for (const s of schools) {
      add(s.deadline, { type: 'school', name: s.name, detail: `${s.decisionPlan} application` })
    }
    for (const e of essays) {
      add(e.deadline, {
        type: 'essay',
        name: e.schoolName ?? 'Common App',
        detail: e.prompt.length > 60 ? e.prompt.slice(0, 60) + '…' : e.prompt,
      })
    }

    return map
  }, [schools, essays, year, month])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const totalDeadlines = [...deadlineMap.values()].reduce((n, arr) => n + arr.length, 0)

  const prevMonth = () => {
    setSelectedDay(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    setSelectedDay(null)
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-light">Calendar</h1>
          <p className="text-sm text-muted mt-0.5">
            {totalDeadlines > 0
              ? `${totalDeadlines} deadline${totalDeadlines !== 1 ? 's' : ''} this month`
              : 'No deadlines this month'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-border text-muted hover:text-light transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-light w-44 text-center text-sm">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-border text-muted hover:text-light transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-card overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-xs font-medium text-muted">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }, (_, i) => {
              const day = i - firstDay + 1
              const valid = day >= 1 && day <= daysInMonth
              const items = valid ? (deadlineMap.get(day) ?? []) : []
              const selected = valid && selectedDay === day
              const clickable = valid && items.length > 0

              return (
                <div
                  key={i}
                  onClick={() => clickable && setSelectedDay(selected ? null : day)}
                  className={[
                    'min-h-[80px] p-2 border-b border-r border-border',
                    i % 7 === 6 ? 'border-r-0' : '',
                    selected ? 'bg-beacon-dim' : valid && clickable ? 'hover:bg-border/40 cursor-pointer' : '',
                    'transition-colors',
                  ].join(' ')}
                >
                  {valid && (
                    <>
                      <div className={[
                        'w-7 h-7 flex items-center justify-center text-sm font-medium rounded-full mb-1',
                        isToday(day)
                          ? 'bg-beacon text-white'
                          : 'text-light',
                      ].join(' ')}>
                        {day}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {items.slice(0, 2).map((item, j) => (
                          <div
                            key={j}
                            className={`text-xs px-1.5 py-0.5 rounded-md truncate font-medium ${
                              item.type === 'school'
                                ? 'bg-beacon/20 text-beacon'
                                : 'bg-warn/15 text-warn'
                            }`}
                          >
                            {item.name}
                          </div>
                        ))}
                        {items.length > 2 && (
                          <p className="text-xs text-muted px-1">+{items.length - 2} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Selected day detail panel */}
          {selectedDay !== null && deadlineMap.has(selectedDay) && (
            <div className="border-t border-border p-4">
              <h3 className="text-sm font-semibold text-light mb-3">
                {MONTHS[month]} {selectedDay}, {year}
              </h3>
              <div className="flex flex-col gap-2">
                {deadlineMap.get(selectedDay)!.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-ink">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      item.type === 'school' ? 'bg-beacon' : 'bg-warn'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted uppercase tracking-wide">
                        {item.type === 'school' ? 'School Deadline' : 'Essay Deadline'}
                      </p>
                      <p className="text-sm font-medium text-light">{item.name}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state — shown when no deadlines exist anywhere this month */}
          {totalDeadlines === 0 && (
            <div className="p-12 text-center">
              <Calendar size={32} className="text-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted">
                No deadlines set — add deadlines to your schools and essays
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
