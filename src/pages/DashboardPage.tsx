import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { School, FileText, Mail, TrendingUp, ArrowRight, Clock, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSchools } from '@/hooks/useSchools'
import { useEssays } from '@/hooks/useEssays'
import { useLORs } from '@/hooks/useLORs'
import { Card, Badge, Spinner } from '@/components/ui'
import type { FitResult } from '@/types'

function daysUntil(iso?: string) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function loadFitCache(): Record<string, FitResult> {
  try { return JSON.parse(localStorage.getItem('beacon-fit-v1') ?? '{}') }
  catch { return {} }
}

export function DashboardPage() {
  const { user } = useAuth()
  const { schools, loading: sl } = useSchools()
  const { essays, loading: el } = useEssays()
  const { lors, loading: ll } = useLORs()

  const stats = useMemo(() => ({
    schools: schools.length,
    accepted: schools.filter(s => s.status === 'accepted').length,
    submitted: schools.filter(s => s.status === 'submitted').length,
    essays: essays.length,
    essaysDone: essays.filter(e => e.status === 'submitted' || e.status === 'final').length,
    lors: lors.length,
    lorsSubmitted: lors.filter(l => l.status === 'submitted').length,
  }), [schools, essays, lors])

  const urgentDeadlines = useMemo(() => {
    const items = [
      ...schools.filter(s => s.deadline).map(s => ({
        label: s.name,
        deadline: s.deadline!,
        type: 'school',
      })),
      ...essays.filter(e => e.deadline).map(e => ({
        label: e.prompt.slice(0, 50) + '…',
        deadline: e.deadline!,
        type: 'essay',
      })),
    ]
    return items
      .map(item => ({ ...item, days: daysUntil(item.deadline) }))
      .filter(item => item.days !== null && item.days >= 0 && item.days <= 30)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .slice(0, 5)
  }, [schools, essays])

  const fitCache = useMemo(loadFitCache, [])
  const analyzedSchools = useMemo(() => schools.filter(s => fitCache[s.id]), [schools, fitCache])

  const loading = sl || el || ll
  const firstName = user?.displayName?.split(' ')[0] ?? 'Student'

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-light">
          Good {getGreeting()}, {firstName}.
        </h1>
        <p className="text-muted mt-1 text-sm">Here's your application overview.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              icon={<School size={16} />}
              label="Schools"
              to="/schools"
              primary={`${stats.schools} added`}
              secondary={`${stats.submitted} submitted · ${stats.accepted} accepted`}
            />
            <StatCard
              icon={<FileText size={16} />}
              label="Essays"
              to="/essays"
              primary={`${stats.essays} total`}
              secondary={`${stats.essaysDone} finalized`}
            />
            <StatCard
              icon={<Mail size={16} />}
              label="Recommendations"
              to="/lors"
              primary={`${stats.lors} requested`}
              secondary={`${stats.lorsSubmitted} submitted`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Upcoming deadlines */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-beacon" />
                <h2 className="text-sm font-semibold text-light">Upcoming Deadlines</h2>
              </div>
              {urgentDeadlines.length === 0 ? (
                <p className="text-sm text-muted">No deadlines in the next 30 days.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {urgentDeadlines.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.days! <= 7 && (
                          <span className="w-2 h-2 rounded-full bg-danger animate-pulse shrink-0" />
                        )}
                        <p className="text-sm text-body truncate">{item.label}</p>
                      </div>
                      <Badge color={item.days! <= 7 ? 'red' : item.days! <= 14 ? 'yellow' : 'gray'}>
                        {item.days === 0 ? 'Today' : `${item.days}d`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Progress */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-beacon" />
                <h2 className="text-sm font-semibold text-light">Application Progress</h2>
              </div>
              <div className="flex flex-col gap-4">
                <ProgressRow label="Schools submitted" done={stats.submitted} total={stats.schools} />
                <ProgressRow label="Essays finalized" done={stats.essaysDone} total={stats.essays} />
                <ProgressRow label="LORs secured" done={stats.lorsSubmitted} total={stats.lors} />
              </div>
            </Card>
          </div>

          {/* Strength widget — only shown when at least one school has been analyzed */}
          {analyzedSchools.length > 0 && (
            <StrengthWidget
              analyzed={analyzedSchools.map(s => ({ id: s.id, name: s.name, fit: fitCache[s.id] }))}
              totalSchools={schools.length}
            />
          )}
        </>
      )}
    </div>
  )
}

function StrengthWidget({
  analyzed,
  totalSchools,
}: {
  analyzed: { id: string; name: string; fit: FitResult }[]
  totalSchools: number
}) {
  const avg = Math.round(analyzed.reduce((sum, s) => sum + s.fit.fitScore, 0) / analyzed.length)
  const labels = ['Safety', 'Likely', 'Good Match', 'Reach', 'Stretch'] as const
  const dist = labels
    .map(label => ({ label, count: analyzed.filter(s => s.fit.fitLabel === label).length }))
    .filter(d => d.count > 0)
  const notAnalyzed = totalSchools - analyzed.length
  const barColor = avg >= 75 ? 'bg-success' : avg >= 50 ? 'bg-warn' : 'bg-danger'
  const textColor = avg >= 75 ? 'text-success' : avg >= 50 ? 'text-warn' : 'text-danger'

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className="text-beacon" />
        <h2 className="text-sm font-semibold text-light">Application Strength</h2>
        <span className="text-xs text-muted ml-1">{analyzed.length} school{analyzed.length !== 1 ? 's' : ''} analyzed</span>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="shrink-0">
          <span className={`text-3xl font-bold ${textColor}`}>{avg}</span>
          <p className="text-xs text-muted">avg fit score</p>
        </div>
        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${avg}%` }} />
        </div>
      </div>
      {dist.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {dist.map(d => (
            <span key={d.label} className="text-xs bg-border text-muted px-2 py-0.5 rounded-full">
              {d.count} {d.label}
            </span>
          ))}
        </div>
      )}
      {notAnalyzed > 0 && (
        <Link to="/schools" className="text-xs text-beacon hover:underline">
          Analyze {notAnalyzed} more school{notAnalyzed !== 1 ? 's' : ''} →
        </Link>
      )}
    </Card>
  )
}

function StatCard({
  icon, label, to, primary, secondary,
}: {
  icon: React.ReactNode
  label: string
  to: string
  primary: string
  secondary: string
}) {
  return (
    <Card className="p-5 hover:border-beacon/40 transition-colors group">
      <Link to={to} className="block">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-beacon">{icon}<span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span></div>
          <ArrowRight size={14} className="text-muted group-hover:text-beacon transition-colors" />
        </div>
        <p className="text-xl font-semibold text-light">{primary}</p>
        <p className="text-xs text-muted mt-0.5">{secondary}</p>
      </Link>
    </Card>
  )
}

function ProgressRow({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-body">{label}</span>
        <span className="text-xs text-muted">{done}/{total}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-beacon rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
