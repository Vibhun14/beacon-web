import { useState, useEffect } from 'react'
import { useProfile } from '@/context/ProfileContext'
import { Button, Input, Select, Combobox, type ComboboxOption } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const US_STATES: ComboboxOption[] = [
  { label: 'Alabama', value: 'AL' }, { label: 'Alaska', value: 'AK' },
  { label: 'Arizona', value: 'AZ' }, { label: 'Arkansas', value: 'AR' },
  { label: 'California', value: 'CA' }, { label: 'Colorado', value: 'CO' },
  { label: 'Connecticut', value: 'CT' }, { label: 'Delaware', value: 'DE' },
  { label: 'Florida', value: 'FL' }, { label: 'Georgia', value: 'GA' },
  { label: 'Hawaii', value: 'HI' }, { label: 'Idaho', value: 'ID' },
  { label: 'Illinois', value: 'IL' }, { label: 'Indiana', value: 'IN' },
  { label: 'Iowa', value: 'IA' }, { label: 'Kansas', value: 'KS' },
  { label: 'Kentucky', value: 'KY' }, { label: 'Louisiana', value: 'LA' },
  { label: 'Maine', value: 'ME' }, { label: 'Maryland', value: 'MD' },
  { label: 'Massachusetts', value: 'MA' }, { label: 'Michigan', value: 'MI' },
  { label: 'Minnesota', value: 'MN' }, { label: 'Mississippi', value: 'MS' },
  { label: 'Missouri', value: 'MO' }, { label: 'Montana', value: 'MT' },
  { label: 'Nebraska', value: 'NE' }, { label: 'Nevada', value: 'NV' },
  { label: 'New Hampshire', value: 'NH' }, { label: 'New Jersey', value: 'NJ' },
  { label: 'New Mexico', value: 'NM' }, { label: 'New York', value: 'NY' },
  { label: 'North Carolina', value: 'NC' }, { label: 'North Dakota', value: 'ND' },
  { label: 'Ohio', value: 'OH' }, { label: 'Oklahoma', value: 'OK' },
  { label: 'Oregon', value: 'OR' }, { label: 'Pennsylvania', value: 'PA' },
  { label: 'Rhode Island', value: 'RI' }, { label: 'South Carolina', value: 'SC' },
  { label: 'South Dakota', value: 'SD' }, { label: 'Tennessee', value: 'TN' },
  { label: 'Texas', value: 'TX' }, { label: 'Utah', value: 'UT' },
  { label: 'Vermont', value: 'VT' }, { label: 'Virginia', value: 'VA' },
  { label: 'Washington', value: 'WA' }, { label: 'Washington D.C.', value: 'DC' },
  { label: 'West Virginia', value: 'WV' }, { label: 'Wisconsin', value: 'WI' },
  { label: 'Wyoming', value: 'WY' },
]

const MAJORS: ComboboxOption[] = [
  { label: 'Undecided', value: '' },
  { label: 'Accounting', value: 'Accounting' },
  { label: 'Aerospace Engineering', value: 'Aerospace Engineering' },
  { label: 'African American Studies', value: 'African American Studies' },
  { label: 'Agriculture', value: 'Agriculture' },
  { label: 'Anthropology', value: 'Anthropology' },
  { label: 'Architecture', value: 'Architecture' },
  { label: 'Art History', value: 'Art History' },
  { label: 'Biochemistry', value: 'Biochemistry' },
  { label: 'Biology', value: 'Biology' },
  { label: 'Biomedical Engineering', value: 'Biomedical Engineering' },
  { label: 'Business Administration', value: 'Business Administration' },
  { label: 'Chemical Engineering', value: 'Chemical Engineering' },
  { label: 'Chemistry', value: 'Chemistry' },
  { label: 'Civil Engineering', value: 'Civil Engineering' },
  { label: 'Communications', value: 'Communications' },
  { label: 'Computer Engineering', value: 'Computer Engineering' },
  { label: 'Computer Science', value: 'Computer Science' },
  { label: 'Criminal Justice', value: 'Criminal Justice' },
  { label: 'Data Science', value: 'Data Science' },
  { label: 'Economics', value: 'Economics' },
  { label: 'Education', value: 'Education' },
  { label: 'Electrical Engineering', value: 'Electrical Engineering' },
  { label: 'English Literature', value: 'English Literature' },
  { label: 'Environmental Science', value: 'Environmental Science' },
  { label: 'Film Studies', value: 'Film Studies' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Graphic Design', value: 'Graphic Design' },
  { label: 'History', value: 'History' },
  { label: 'Industrial Engineering', value: 'Industrial Engineering' },
  { label: 'Information Systems', value: 'Information Systems' },
  { label: 'International Relations', value: 'International Relations' },
  { label: 'Journalism', value: 'Journalism' },
  { label: 'Kinesiology', value: 'Kinesiology' },
  { label: 'Linguistics', value: 'Linguistics' },
  { label: 'Marine Biology', value: 'Marine Biology' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Mathematics', value: 'Mathematics' },
  { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
  { label: 'Music', value: 'Music' },
  { label: 'Neuroscience', value: 'Neuroscience' },
  { label: 'Nursing', value: 'Nursing' },
  { label: 'Philosophy', value: 'Philosophy' },
  { label: 'Physics', value: 'Physics' },
  { label: 'Political Science', value: 'Political Science' },
  { label: 'Pre-Dentistry', value: 'Pre-Dentistry' },
  { label: 'Pre-Law', value: 'Pre-Law' },
  { label: 'Pre-Medicine', value: 'Pre-Medicine' },
  { label: 'Psychology', value: 'Psychology' },
  { label: 'Public Health', value: 'Public Health' },
  { label: 'Public Policy', value: 'Public Policy' },
  { label: 'Social Work', value: 'Social Work' },
  { label: 'Sociology', value: 'Sociology' },
  { label: 'Software Engineering', value: 'Software Engineering' },
  { label: 'Statistics', value: 'Statistics' },
  { label: 'Theater', value: 'Theater' },
  { label: 'Urban Planning', value: 'Urban Planning' },
]

const GRAD_YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i)

export function SettingsPage() {
  const { profile, saveProfile } = useProfile()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', graduationYear: GRAD_YEARS[0],
    gpa: '', sat: '', act: '', state: 'CA', intendedMajor: '',
  })

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        graduationYear: profile.graduationYear,
        gpa: profile.gpa?.toString() ?? '',
        sat: profile.sat?.toString() ?? '',
        act: profile.act?.toString() ?? '',
        state: profile.state,
        intendedMajor: profile.intendedMajor ?? '',
      })
    }
  }, [profile])

  const set = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return
    setSaving(true)
    try {
      await saveProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        graduationYear: Number(form.graduationYear),
        gpa: form.gpa ? parseFloat(form.gpa) : undefined,
        sat: form.sat ? parseInt(form.sat) : undefined,
        act: form.act ? parseInt(form.act) : undefined,
        state: form.state,
        intendedMajor: form.intendedMajor || undefined,
      })
      toast.success('Profile saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-light">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Manage your profile and preferences.</p>
      </div>
      <div className="bg-surface rounded-2xl border border-border shadow-card p-6">
        <h2 className="font-semibold text-light mb-4">Profile</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="firstName" label="First Name" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            <Input id="lastName" label="Last Name" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </div>
          <Select id="gradYear" label="Graduation Year" value={form.graduationYear} onChange={e => set('graduationYear', Number(e.target.value))}>
            {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input id="gpa" label="GPA" type="number" step="0.01" min="0" max="4.0" value={form.gpa} onChange={e => set('gpa', e.target.value)} />
            <Input id="sat" label="SAT" type="number" value={form.sat} onChange={e => set('sat', e.target.value)} />
            <Input id="act" label="ACT" type="number" value={form.act} onChange={e => set('act', e.target.value)} />
          </div>
          <Combobox
            label="Home State"
            value={form.state}
            onChange={v => set('state', v)}
            options={US_STATES}
            placeholder="Search states…"
          />
          <Combobox
            label="Intended Major (optional)"
            value={form.intendedMajor}
            onChange={v => set('intendedMajor', v)}
            options={MAJORS}
            placeholder="Search majors…"
          />
          <div className="pt-2">
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </div>
      <div className="bg-surface rounded-2xl border border-border shadow-card p-6 mt-4">
        <h2 className="font-semibold text-light mb-1">Account</h2>
        <p className="text-sm text-muted">{user?.email}</p>
      </div>
    </div>
  )
}
