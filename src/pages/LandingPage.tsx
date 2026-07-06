import { Link, Navigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

// Landing page is always dark — use hardcoded dark palette hex values
// so it looks correct regardless of the user's app theme setting.

const SCHOOLS = [
  'MIT', 'Stanford', 'Harvard', 'Princeton', 'UPenn', 'Yale',
  'Columbia', 'Duke', 'Northwestern', 'Cornell', 'Georgia Tech',
  'Carnegie Mellon', 'Brown', 'Dartmouth', 'Johns Hopkins', 'Rice',
]

const FEATURES = [
  {
    icon: '🏫',
    title: 'School List',
    desc: 'Search 6,000+ colleges. Track status, deadlines, decision plans, and acceptance odds against your stats.',
  },
  {
    icon: '✍️',
    title: 'Essay Tracker',
    desc: 'Every prompt, organized by school. Track drafts, word counts, and deadlines in one view.',
  },
  {
    icon: '📬',
    title: 'Recommendations',
    desc: "Manage every LOR request. Know exactly who's submitted and who hasn't.",
  },
  {
    icon: '📅',
    title: 'Deadline Calendar',
    desc: 'Never miss a date. Every school and essay deadline on one visual calendar.',
  },
  {
    icon: '📊',
    title: 'School Compare',
    desc: 'Side-by-side stats for any schools on your list. Tuition, admit rate, SAT ranges, aid.',
  },
  {
    icon: '🎯',
    title: 'Reach / Match / Safety',
    desc: 'Your stats vs. their averages. Instantly know where you stand at every school.',
  },
]

const MOCK_ACTIVITIES = [
  {
    type: 'Club',
    org: 'Math Olympiad Team',
    role: 'President & Co-founder',
    desc: 'Led 24-member team to state finals; organized regional competitions.',
    grades: [9, 10, 11, 12],
    hours: 4,
  },
  {
    type: 'Research',
    org: 'Dr. Kim Lab, MIT',
    role: 'Research Intern',
    desc: 'Studied genomic variations in cancer cell lines using CRISPR.',
    grades: [11, 12],
    hours: 10,
  },
]

const MOCK_RESUME_LINES = [
  'Jane Smith | jane@example.com',
  'Class of 2027, GPA 4.0 W',
  '',
  'ACTIVITIES',
  'Stanford AI Lab — Research Intern',
  'Varsity Debate — Captain, 4h/wk',
  'Science Olympiad — President',
  '',
  'AWARDS',
  'National Merit Semifinalist',
  'AP Scholar with Distinction',
]

const MOCK_PARSED = [
  { type: 'Research', org: 'Stanford AI Lab', role: 'Research Intern' },
  { type: 'Club', org: 'Varsity Debate', role: 'Captain' },
  { type: 'Club', org: 'Science Olympiad', role: 'President' },
]

// ─── Sections ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 text-center">
      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#5B8AF0] opacity-[0.07] blur-[120px] animate-gradient-drift" />
      </div>

      {/* Logo */}
      <img
        src="/BeaconLogo.png"
        alt="Beacon"
        className="w-16 h-16 object-contain mb-8 animate-float-up"
        style={{ animationDelay: '0ms' }}
      />

      {/* Headline */}
      <h1
        className="font-display text-[64px] md:text-[80px] text-[#E4E8F5] leading-[1.05] max-w-3xl mb-6 animate-float-up"
        style={{ animationDelay: '80ms' }}
      >
        Everything it takes<br />
        to get in —{' '}
        <em className="not-italic text-[#5B8AF0]">organized.</em>
      </h1>

      {/* Subhead */}
      <p
        className="text-[#A8B0C8] text-lg md:text-xl leading-relaxed max-w-xl mb-10 animate-float-up"
        style={{ animationDelay: '160ms' }}
      >
        Beacon is the free college application command center built for students who take this seriously.
      </p>

      {/* CTAs */}
      <div
        className="flex items-center gap-4 flex-wrap justify-center animate-float-up"
        style={{ animationDelay: '240ms' }}
      >
        <Link
          to="/auth"
          className="px-7 py-3.5 bg-[#5B8AF0] text-white rounded-xl font-medium text-sm hover:bg-[#4a79df] transition-all shadow-[0_0_32px_rgba(91,138,240,0.3)] hover:shadow-[0_0_44px_rgba(91,138,240,0.45)]"
        >
          Get started free
        </Link>
        <a
          href="#features"
          className="px-7 py-3.5 border border-[#252A3A] text-[#A8B0C8] rounded-xl font-medium text-sm hover:border-[#5B8AF0]/50 hover:text-[#E4E8F5] transition-all"
        >
          See how it works
        </a>
      </div>

      {/* Down caret */}
      <a
        href="#features"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#4A5168] hover:text-[#A8B0C8] transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown size={22} />
      </a>
    </section>
  )
}

function MarqueeBar() {
  const doubled = [...SCHOOLS, ...SCHOOLS]
  return (
    <div className="border-y border-[#252A3A] overflow-hidden py-4">
      <div className="flex whitespace-nowrap animate-marquee">
        {doubled.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-3 px-6 text-sm text-[#4A5168] font-medium tracking-wide">
            {s}
            <span className="text-[#252A3A]">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Features() {
  return (
    <section id="features" className="py-28 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-[#5B8AF0] text-xs font-semibold uppercase tracking-widest mb-4">Features</p>
        <h2 className="font-display text-[44px] md:text-[52px] text-[#E4E8F5] leading-tight">
          All the things top applicants track —<br className="hidden md:block" /> in one place.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURES.map(f => (
          <div
            key={f.title}
            className="p-7 bg-[#181C27] border border-[#252A3A] rounded-2xl hover:border-[#5B8AF0]/30 hover:bg-[#1a2030] transition-all group"
          >
            <div className="text-4xl mb-5">{f.icon}</div>
            <h3 className="font-display text-[22px] text-[#E4E8F5] mb-2 group-hover:text-[#5B8AF0] transition-colors">
              {f.title}
            </h3>
            <p className="text-sm text-[#A8B0C8] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function StatsStrip() {
  const stats = [
    { value: '6,000+', label: 'Schools tracked' },
    { value: '2027', label: 'Application cycle ready' },
    { value: '100%', label: 'Free, forever' },
  ]
  return (
    <div className="mx-6 md:mx-auto max-w-6xl mb-28">
      <div className="bg-[#181C27] border border-[#252A3A] rounded-2xl px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-[#252A3A]">
        {stats.map(s => (
          <div key={s.value} className="text-center md:px-8 pt-8 md:pt-0 first:pt-0">
            <p className="font-display text-[52px] text-[#5B8AF0] leading-none mb-2">{s.value}</p>
            <p className="text-sm text-[#A8B0C8] font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivitiesTeaser() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Copy */}
        <div>
          <p className="text-[#5B8AF0] text-xs font-semibold uppercase tracking-widest mb-5">Profile Builder</p>
          <h2 className="font-display text-[44px] md:text-[52px] text-[#E4E8F5] leading-[1.1] mb-6">
            Your story,<br />not just your grades.
          </h2>
          <p className="text-[#A8B0C8] text-lg leading-relaxed mb-6">
            Build your activities list and honors section the right way — structured exactly like the Common App, designed to help you say more with less.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-[#5B8AF0] text-sm font-medium hover:gap-3 transition-all"
          >
            Start building your profile →
          </Link>
        </div>

        {/* Mock UI */}
        <div className="bg-[#181C27] border border-[#252A3A] rounded-2xl p-5 space-y-3 shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-1 px-1">
            <p className="text-xs font-semibold text-[#4A5168] uppercase tracking-widest">Activities</p>
            <p className="text-xs text-[#4A5168]">2 / 10</p>
          </div>
          {MOCK_ACTIVITIES.map((a, i) => (
            <div key={i} className="bg-[#0F1117] border border-[#252A3A] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-[#E4E8F5] leading-tight">{a.org}</p>
                  <p className="text-xs text-[#4A5168] mt-0.5">{a.role} · {a.hours}h/wk</p>
                </div>
                <span className="text-xs text-[#5B8AF0] bg-[#1E2E52] px-2 py-0.5 rounded-md font-medium shrink-0">
                  {a.type}
                </span>
              </div>
              <p className="text-xs text-[#A8B0C8] mb-3 line-clamp-1">{a.desc}</p>
              <div className="flex items-center gap-1.5">
                {[9, 10, 11, 12].map(g => (
                  <span
                    key={g}
                    className={`text-xs w-6 h-6 flex items-center justify-center rounded-md font-medium ${
                      a.grades.includes(g)
                        ? 'bg-[#1E2E52] text-[#5B8AF0]'
                        : 'text-[#252A3A]'
                    }`}
                  >
                    {g}
                  </span>
                ))}
                <span className="ml-auto text-xs text-[#4A5168]">
                  School year
                </span>
              </div>
            </div>
          ))}
          <button className="w-full border border-dashed border-[#252A3A] rounded-xl py-2.5 text-xs text-[#4A5168] hover:border-[#5B8AF0]/30 hover:text-[#5B8AF0]/70 transition-colors">
            + Add activity
          </button>
        </div>
      </div>
    </section>
  )
}

function ResumeTeaser() {
  return (
    <section className="py-28 px-6 bg-[#181C27]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Two-panel mockup */}
        <div className="grid grid-cols-2 gap-3 order-2 lg:order-1 shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          {/* Left: paste resume */}
          <div className="bg-[#0F1117] border border-[#252A3A] rounded-xl p-4">
            <p className="text-xs text-[#4A5168] uppercase tracking-widest font-semibold mb-3">Paste resume</p>
            <div className="space-y-1.5">
              {MOCK_RESUME_LINES.map((line, i) =>
                line === '' ? (
                  <div key={i} className="h-2" />
                ) : (
                  <p key={i} className={`text-xs font-mono leading-tight ${
                    line === 'ACTIVITIES' || line === 'AWARDS'
                      ? 'text-[#5B8AF0] font-semibold'
                      : 'text-[#4A5168]'
                  }`}>
                    {line}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Right: parsed result */}
          <div className="bg-[#0F1117] border border-[#252A3A] rounded-xl p-4">
            <p className="text-xs text-[#4A5168] uppercase tracking-widest font-semibold mb-3">Parsed</p>
            <div className="space-y-3">
              {MOCK_PARSED.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="mt-0.5 w-4 h-4 rounded border-2 border-[#5B8AF0] shrink-0 flex items-center justify-center bg-[#1E2E52]">
                    <div className="w-1.5 h-1.5 bg-[#5B8AF0] rounded-sm" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#E4E8F5] leading-tight">{item.org}</p>
                    <p className="text-xs text-[#4A5168]">{item.role}</p>
                  </div>
                </div>
              ))}
              <button className="mt-2 w-full bg-[#5B8AF0] text-white text-xs py-1.5 rounded-lg font-medium">
                Import 3 activities
              </button>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <p className="text-[#5B8AF0] text-xs font-semibold uppercase tracking-widest mb-5">AI-powered</p>
          <h2 className="font-display text-[44px] md:text-[52px] text-[#E4E8F5] leading-[1.1] mb-6">
            Already have a resume?{' '}
            <em className="not-italic text-[#5B8AF0]">Import it.</em>
          </h2>
          <p className="text-[#A8B0C8] text-lg leading-relaxed">
            Paste your resume and Beacon auto-fills your activities, awards, and timeline. No manual entry.
          </p>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#252A3A] px-6 py-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <img src="/BeaconLogo.png" alt="Beacon" className="w-6 h-6 object-contain opacity-70" />
          <span className="font-display text-lg text-[#E4E8F5]">Beacon</span>
        </div>
        <p className="text-xs text-[#4A5168] font-medium">Built for the Class of 2027</p>
        <Link to="/auth" className="text-xs text-[#A8B0C8] hover:text-[#5B8AF0] transition-colors font-medium">
          Sign in →
        </Link>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="bg-[#0F1117] text-[#E4E8F5] min-h-screen font-sans">
      <Hero />
      <MarqueeBar />
      <Features />
      <StatsStrip />
      <ActivitiesTeaser />
      <ResumeTeaser />
      <Footer />
    </div>
  )
}
