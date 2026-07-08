import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { useSchools } from '@/hooks/useSchools'
import { useEssays } from '@/hooks/useEssays'
import { useLORs } from '@/hooks/useLORs'
import { getActivities, getHonors } from '@/lib/db'
import type { Activity, Honor, OnboardingData, ProfileStats } from '@/types'

export function PrintView() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { schools } = useSchools()
  const { essays } = useEssays()
  const { lors } = useLORs()
  const [activities, setActivities] = useState<Activity[]>([])
  const [honors, setHonors] = useState<Honor[]>([])

  useEffect(() => {
    if (!user) return
    getActivities(user.uid).then(setActivities).catch(() => {})
    getHonors(user.uid).then(setHonors).catch(() => {})
  }, [user])

  const p = profile as (OnboardingData & ProfileStats) | null
  const pp = p as unknown as Record<string, unknown>
  const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const STATUS_LABELS: Record<string, string> = {
    researching: 'Researching', planning: 'Planning', in_progress: 'In Progress',
    submitted: 'Submitted', deferred: 'Deferred', waitlisted: 'Waitlisted',
    accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn',
  }

  const ESSAY_STATUS: Record<string, string> = {
    not_started: 'Not Started', drafting: 'Drafting', revising: 'Revising',
    final: 'Final', submitted: 'Submitted',
  }

  const LOR_STATUS: Record<string, string> = {
    not_asked: 'Not Asked', asked: 'Asked', confirmed: 'Confirmed', submitted: 'Submitted',
  }

  return (
    <div className="print-only" style={{ fontFamily: 'Georgia, serif', fontSize: '12pt', color: '#000', background: '#fff', padding: '0' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '20pt', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>Beacon</div>
          <div style={{ fontSize: '14pt', color: '#444', marginTop: '4px' }}>Application Summary</div>
        </div>
        <div style={{ textAlign: 'right', color: '#666', fontSize: '10pt' }}>
          <div>{p ? `${p.firstName} ${p.lastName}` : 'Student'}</div>
          <div>Class of {p?.graduationYear ?? '—'}</div>
          <div>Generated {exportDate}</div>
        </div>
      </div>

      {/* Profile Stats */}
      {p && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '10px' }}>Academic Profile</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 8px', width: '25%' }}><strong>GPA (Weighted)</strong></td>
                <td style={{ padding: '3px 8px', width: '25%' }}>{pp.gpaWeighted as string ?? p.gpa ?? '—'}</td>
                <td style={{ padding: '3px 8px', width: '25%' }}><strong>GPA (Unweighted)</strong></td>
                <td style={{ padding: '3px 8px', width: '25%' }}>{pp.gpaUnweighted as string ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px' }}><strong>SAT Total</strong></td>
                <td style={{ padding: '3px 8px' }}>{pp.satTotal as string ?? p.sat ?? '—'}</td>
                <td style={{ padding: '3px 8px' }}><strong>SAT Math / EBRW</strong></td>
                <td style={{ padding: '3px 8px' }}>{pp.satMath as string ?? '—'} / {pp.satEBRW as string ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px' }}><strong>ACT Composite</strong></td>
                <td style={{ padding: '3px 8px' }}>{pp.actComposite as string ?? p.act ?? '—'}</td>
                <td style={{ padding: '3px 8px' }}><strong>Class Rank</strong></td>
                <td style={{ padding: '3px 8px' }}>
                  {pp.classRank && pp.classSize
                    ? `${pp.classRank} / ${pp.classSize}`
                    : '—'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 8px' }}><strong>Intended Major</strong></td>
                <td style={{ padding: '3px 8px' }} colSpan={3}>{p.intendedMajor ?? 'Undecided'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* School List */}
      {schools.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '10px' }}>Schools ({schools.length})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #999', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px' }}>School</th>
                <th style={{ padding: '4px 8px' }}>Status</th>
                <th style={{ padding: '4px 8px' }}>Plan</th>
                <th style={{ padding: '4px 8px' }}>Deadline</th>
                <th style={{ padding: '4px 8px' }}>Admit Rate</th>
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px 8px', fontWeight: '500' }}>{s.name}</td>
                  <td style={{ padding: '4px 8px' }}>{STATUS_LABELS[s.status] ?? s.status}</td>
                  <td style={{ padding: '4px 8px' }}>{s.decisionPlan}</td>
                  <td style={{ padding: '4px 8px' }}>{s.deadline ? new Date(s.deadline).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '4px 8px' }}>{s.acceptanceRate != null ? `${Math.round(s.acceptanceRate * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Essays */}
      {essays.length > 0 && (
        <div className="print-page-break" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '10px' }}>Essays ({essays.length})</div>
          {(() => {
            const grouped = new Map<string, typeof essays>()
            for (const e of essays) {
              const k = e.schoolName ?? 'Common App / Universal'
              if (!grouped.has(k)) grouped.set(k, [])
              grouped.get(k)!.push(e)
            }
            return [...grouped.entries()].map(([school, list]) => (
              <div key={school} style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: '4px', color: '#333' }}>{school}</div>
                {list.map((e, i) => (
                  <div key={i} style={{ paddingLeft: '12px', marginBottom: '4px', fontSize: '10pt', color: '#444' }}>
                    <span>· {e.prompt.slice(0, 100)}{e.prompt.length > 100 ? '…' : ''}</span>
                    <span style={{ marginLeft: '8px', color: '#888' }}>
                      {e.wordLimit ? `${e.wordLimit}w · ` : ''}{ESSAY_STATUS[e.status]}
                    </span>
                  </div>
                ))}
              </div>
            ))
          })()}
        </div>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <div className="print-page-break" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '10px' }}>Activities ({activities.length})</div>
          {activities.map((a, i) => (
            <div key={i} style={{ marginBottom: '10px', paddingLeft: '8px', borderLeft: '2px solid #ddd', fontSize: '10pt' }}>
              <div style={{ fontWeight: '600' }}>{a.organization} — {a.role} <span style={{ fontWeight: 'normal', color: '#666' }}>({a.type})</span></div>
              <div style={{ color: '#444', marginTop: '2px' }}>{a.description}</div>
              <div style={{ color: '#888', fontSize: '9pt', marginTop: '2px' }}>
                Grades {a.grades.join(', ')} · {a.hoursPerWeek}h/wk · {a.weeksPerYear}wks/yr · {a.timing}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Honors */}
      {honors.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '10px' }}>Honors & Awards ({honors.length})</div>
          {honors.map((h, i) => (
            <div key={i} style={{ marginBottom: '6px', fontSize: '10pt' }}>
              <span style={{ fontWeight: '600' }}>{h.title}</span>
              <span style={{ color: '#666', marginLeft: '8px' }}>{h.level} · Grades {h.grades.join(', ')}</span>
              {h.description && <span style={{ color: '#888', marginLeft: '8px' }}>{h.description}</span>}
            </div>
          ))}
        </div>
      )}

      {/* LORs */}
      {lors.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '10px' }}>Recommendations ({lors.length})</div>
          {lors.map(l => (
            <div key={l.id} style={{ marginBottom: '6px', fontSize: '10pt' }}>
              <span style={{ fontWeight: '600' }}>{l.recommenderName}</span>
              {l.recommenderTitle && <span style={{ color: '#666', marginLeft: '8px' }}>{l.recommenderTitle}</span>}
              <span style={{ color: '#666', marginLeft: '8px' }}>· {l.relationship}</span>
              <span style={{ color: '#888', marginLeft: '8px' }}>· {LOR_STATUS[l.status]}</span>
              {l.deadline && <span style={{ color: '#888', marginLeft: '8px' }}>· Due {new Date(l.deadline).toLocaleDateString()}</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px', marginTop: '24px', fontSize: '9pt', color: '#999', textAlign: 'center' }}>
        Generated by Beacon · {exportDate}
      </div>
    </div>
  )
}
