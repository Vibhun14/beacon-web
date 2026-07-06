import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { School, FileText, Mail, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSchools } from '@/hooks/useSchools'
import { useEssays } from '@/hooks/useEssays'
import { useLORs } from '@/hooks/useLORs'
import { Card, Badge, Spinner } from '@/components/ui'


function daysUntil(iso?: string) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
          {/* Stat cards */}
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

          <div className="grid grid-cols-2 gap-4">
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
                      <p className="text-sm text-body truncate">{item.label}</p>
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
        </>
      )}
    </div>
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
