// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

// ─── Schools ─────────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'researching'
  | 'planning'
  | 'in_progress'
  | 'submitted'
  | 'deferred'
  | 'waitlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export type DecisionPlan = 'ED' | 'EA' | 'EDII' | 'REA' | 'RD'

export interface School {
  id: string
  userId: string
  // From College Scorecard API
  unitId: number
  name: string
  city: string
  state: string
  website?: string
  logoUrl?: string
  acceptanceRate?: number
  avgSAT?: number
  avgACT?: number
  inStateTuition?: number
  outStateTuition?: number
  enrollment?: number
  // Beacon local data
  collegeId?: string          // e.g. "princeton_university" — links to colleges.json
  ranking?: number
  averageAid?: number
  averageStartingSalary?: number
  // User-set fields
  status: ApplicationStatus
  decisionPlan: DecisionPlan
  deadline?: string           // ISO date string
  portalUrl?: string
  notes?: string
  checklist?: Record<string, boolean>
  interviewType?: 'None' | 'Alumni' | 'Optional' | 'Required'
  interviewDate?: string
  interviewFormat?: 'Virtual' | 'In-Person'
  interviewNotes?: string
  interviewOutcome?: string
  createdAt: string
  updatedAt: string
}

// ─── Essays ──────────────────────────────────────────────────────────────────

export type EssayStatus = 'not_started' | 'drafting' | 'revising' | 'final' | 'submitted'

export interface Essay {
  id: string
  userId: string
  schoolId?: string           // null = Common App / universal
  schoolName?: string
  prompt: string
  wordLimit?: number | null
  status: EssayStatus
  draftUrl?: string
  notes?: string
  deadline?: string
  category?: string           // "Community/Diversity", "Intellectual Curiosity", etc.
  wordCount?: number          // user's current draft word count
  createdAt: string
  updatedAt: string
}

// ─── Letters of Recommendation ───────────────────────────────────────────────

export type LORStatus = 'not_asked' | 'asked' | 'confirmed' | 'submitted'

export interface LOR {
  id: string
  userId: string
  recommenderName: string
  recommenderTitle?: string
  recommenderEmail?: string
  relationship: string        // e.g. "AP Physics Teacher"
  status: LORStatus
  requestedAt?: string
  deadline?: string
  submittedAt?: string
  schoolIds: string[]         // which schools this LOR is for
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface OnboardingData {
  firstName: string
  lastName: string
  graduationYear: number
  gpa?: number
  sat?: number
  act?: number
  state: string
  intendedMajor?: string
}

// ─── Supplemental Prompts & College Data ─────────────────────────────────────

export interface SupplementalPrompt {
  id: string
  schoolId: string
  prompt: string
  wordLimit: number | null
  charLimit: number | null
  isRequired: boolean
  category: string
  applicationYear: number
}

export interface CollegeData {
  id: string
  name: string
  location: { city: string; state: string; region?: string }
  type: string
  size?: string
  totalEnrollment: number
  rankingOverall: number | null
  cds: {
    acceptanceRate?: number
    sat25?: number; sat50?: number; sat75?: number
    act25?: number; act50?: number; act75?: number
    avgGPA?: number
    gpaImportance?: string
    testScoreImportance?: string
    essayImportance?: string
    recImportance?: string
    ecImportance?: string
    rigorImportance?: string
  }
  deadlines: {
    earlyAction?: string | null
    earlyDecision?: string | null
    earlyDecision2?: string | null
    regularDecision?: string | null
  }
  lorRequirements: {
    counselor: boolean
    teacherCount: number
    optionalCount: number
    peerRec?: boolean
    notes?: string | null
  }
  tuitionInState: number
  tuitionOutOfState: number
  averageAid: number
  campusSetting: string
  averageStartingSalary: number
  supplementalPrompts: SupplementalPrompt[]
  _ea_offered: boolean
  _ed_offered: boolean
  _ed2_offered?: boolean
}

// ─── Activities & Honors ─────────────────────────────────────────────────────

export type ActivityType = 'Club' | 'Sport' | 'Work' | 'Volunteer' | 'Research' | 'Internship' | 'Arts' | 'Other'
export type TimingType = 'School year' | 'Summer' | 'Both'
export type HonorLevel = 'School' | 'Regional' | 'State' | 'National' | 'International'

export interface Activity {
  type: ActivityType
  organization: string
  role: string
  description: string
  grades: number[]
  hoursPerWeek: number
  weeksPerYear: number
  continueInCollege: boolean
  timing: TimingType
}

export interface Honor {
  title: string
  grades: number[]
  level: HonorLevel
  description: string
}

// ─── Extended Profile Stats ───────────────────────────────────────────────────

export interface ProfileStats {
  gpaWeighted?: number
  gpaUnweighted?: number
  satTotal?: number
  satMath?: number
  satEBRW?: number
  actComposite?: number
  actEnglish?: number
  actMath?: number
  actReading?: number
  actScience?: number
  classRank?: number
  classSize?: number
  apScores?: { subject: string; score: number }[]
}

// ─── School Checklist & Interview ────────────────────────────────────────────

export const CHECKLIST_KEYS = [
  'portalCreated', 'commonAppSubmitted', 'supplementSubmitted', 'appFeePaid',
  'testScoresSent', 'counselorLOR', 'teacherLOR1', 'teacherLOR2', 'cssProfile', 'fafsa',
] as const
export type ChecklistKey = typeof CHECKLIST_KEYS[number]

// ─── Scholarships ─────────────────────────────────────────────────────────────

export type ScholarshipStatus = 'not_started' | 'applied' | 'awarded' | 'rejected'

export interface Scholarship {
  id: string
  name: string
  amount?: number
  deadline?: string
  status: ScholarshipStatus
  link?: string
  notes?: string
}

// ─── Additional Info ─────────────────────────────────────────────────────────

export interface AdditionalInfo {
  github?: string
  linkedin?: string
  website?: string
  portfolio?: string
  publications?: string
  other?: string
}

// ─── AI Features ─────────────────────────────────────────────────────────────

export interface FitResult {
  fitScore: number
  fitLabel: string
  strengths: string[]
  gaps: string[]
  tip: string
}

export interface EssayInsight {
  whatTheyWant: string
  commonMistakes: string[]
  angle: string
  openingHook: string
}

// ─── College Scorecard API ───────────────────────────────────────────────────
// The API returns flat dot-notation keys, not nested objects.

export interface ScorecardSchool {
  id: number
  'school.name'?: string
  'school.city'?: string
  'school.state'?: string
  'school.school_url'?: string
  'latest.admissions.admission_rate.overall'?: number
  'latest.admissions.sat_scores.midpoint.critical_reading'?: number
  'latest.admissions.sat_scores.midpoint.math'?: number
  'latest.admissions.act_scores.midpoint.cumulative'?: number
  'latest.cost.tuition.in_state'?: number
  'latest.cost.tuition.out_of_state'?: number
  'latest.student.size'?: number
}
