import type { ScorecardSchool } from '@/types'

const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'
const API_KEY = import.meta.env.VITE_COLLEGE_SCORECARD_API_KEY

const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.school_url',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.midpoint.critical_reading',
  'latest.admissions.sat_scores.midpoint.math',
  'latest.admissions.act_scores.midpoint.cumulative',
  'latest.cost.tuition.in_state',
  'latest.cost.tuition.out_of_state',
  'latest.student.size',
].join(',')

export async function searchSchools(query: string, page = 0): Promise<ScorecardSchool[]> {
  if (!query.trim()) return []

  // Use append() for the dotted key so URLSearchParams doesn't mangle it
  const params = new URLSearchParams()
  params.append('school.name', query)
  params.append('fields', FIELDS)
  params.append('per_page', '20')
  params.append('page', String(page))
  params.append('api_key', API_KEY)

  const url = `${BASE}?${params}`
  console.log('Scorecard fetch:', url)

  const res = await fetch(url)
  if (!res.ok) {
    console.error('Scorecard error:', res.status, await res.text())
    throw new Error('College Scorecard API error')
  }

  const data = await res.json()
  console.log('First result raw:', JSON.stringify(data.results?.[0]))
  const raw = data.results as ScorecardSchool[]
  const filtered = raw.filter(s => s['school.name'])
  return filtered
}

export async function getSchoolById(unitId: number): Promise<ScorecardSchool | null> {
  const params = new URLSearchParams({
    id: String(unitId),
    fields: FIELDS,
    api_key: API_KEY,
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) return null

  const data = await res.json()
  return data.results?.[0] ?? null
}
