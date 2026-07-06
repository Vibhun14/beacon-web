import collegesData from '@/data/colleges.json'
import type { ScorecardSchool, CollegeData } from '@/types'

const colleges = collegesData as unknown as CollegeData[]

export function getColleges(): CollegeData[] { return colleges }

const ALIASES: Record<string, string> = {
  'mit': 'massachusetts institute of technology',
  'umich': 'university of michigan',
  'unc': 'university of north carolina',
  'uva': 'university of virginia',
  'usc': 'university of southern california',
  'ucla': 'university of california los angeles',
  'ucb': 'university of california berkeley',
  'cal': 'university of california berkeley',
  'cmu': 'carnegie mellon',
  'bu': 'boston university',
  'bc': 'boston college',
  'nu': 'northeastern',
  'nyu': 'new york university',
  'gt': 'georgia tech',
  'gatech': 'georgia tech',
  'uiuc': 'illinois',
  'purdue': 'purdue',
  'nd': 'notre dame',
  'wustl': 'washington university st louis',
  'jhu': 'johns hopkins',
  'upenn': 'university of pennsylvania',
  'penn': 'university of pennsylvania',
  'tufts': 'tufts',
  'vandy': 'vanderbilt',
}

export function searchLocalColleges(query: string): CollegeData[] {
  const raw = query.toLowerCase().trim()
  const q = ALIASES[raw] ?? raw
  if (q.length < 2) return []
  return colleges.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q) ||
    c.location?.city?.toLowerCase().includes(q)
  ).slice(0, 20)
}

export function getCollegeById(id: string): CollegeData | undefined {
  const lower = id.toLowerCase()
  return colleges.find(c => c.id.toLowerCase() === lower)
}

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

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error('College Scorecard API error')

  const data = await res.json()
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
