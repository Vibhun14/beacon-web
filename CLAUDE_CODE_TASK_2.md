# Beacon iOS — Task Batch 2

## Priority Order
1. Bug fixes (blocking usability)
2. Switch all AI calls to Gemini
3. UI overhaul using psychology principles
4. Onboarding redesign
5. Light/dark mode toggle

---

## 1. BUGS (fix first)

### Essays don't auto-populate when adding a school
- Web fixed this — check web's `addSchool` logic to see how it handles essay stub creation
- On iOS, `AppViewModel.addSchool()` calls `LocalSchoolDataService.shared.enrich(school)`
  then creates essay stubs from `enriched.supplementalPrompts`
- Bug: likely a timing issue OR the enriched school has empty prompts because
  `LocalSchoolDataService` hasn't matched the school name yet
- Fix: after saving the school to Firestore, immediately call `forceRefreshSchoolData()`
  for just that one school, then create essay stubs from the result
- Reference web's implementation for the correct flow

### Major selection doesn't work
- `MajorSelectionView` exists in `Features/Onboarding/StatePickerView.swift`
- The majors list comes from `appVM.majors` which loads from Firestore `majors` collection
- Bug: likely `appVM.majors` is empty because Firestore has no data OR `Majors.json`
  in Resources isn't being loaded
- Fix: load majors from bundled `Resources/Majors.json` as fallback if Firestore is empty
  (same pattern as `LocalSchoolDataService` loading `Schools.json`)
- Add a `LocalMajorService` that loads `Majors.json` from bundle on init

### Activities/Honors add button shows blank page
- In `ActivitiesEditView`, tapping Add sets `editingActivity = Activity.placeholder`
  then sets `showEditor = true`
- Bug: the sheet checks `if let editing = editingActivity` but the binding may be stale
- Fix: rewrite to pass the activity directly to `ActivityEditorView` without optional binding
  Use: `.sheet(isPresented: $showEditor) { ActivityEditorView(activity: $newActivity, onSave: ...) }`
- Same pattern fix for `HonorsEditView`

---

## 2. SWITCH ALL AI TO GEMINI

Replace ALL Claude API calls with Gemini. Remove `AIAssistantService.swift` and
`ResumeParserService.swift`. Create one unified `GeminiService.swift` if it doesn't exist.

### Gemini API pattern (key from Bundle Info.plist as GEMINI_API_KEY):
```swift
let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\(apiKey)"
// POST with {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1}}
// Response: candidates[0].content.parts[0].text
```

### Services to convert:
1. **Resume Parser** — PDF text extraction stays the same, just swap Claude API call
   for Gemini. Same JSON output format for ParsedResume.
2. **AI Research Assistant** — the "sparkles" button in EssayEditorView. Same context
   building, just use Gemini endpoint.
3. **AI Tips** (per-prompt tips in essay editor) — already uses Gemini per Claude Code's work
4. **Blunt feedback modal** — already uses Gemini
5. **LOR email drafting** — already uses Gemini

After: zero Claude API calls remain. Only GEMINI_API_KEY needed in Info.plist.

---

## 3. UI OVERHAUL — Apply These Psychology Principles

Read the principles carefully and apply throughout:

### Principle 1: Smart Defaults
- When adding a school, pre-select tier based on acceptance rate:
  - <10% → Dream, 10-20% → Reach, 20-40% → Target, >40% → Safety/Likely
- Pre-select application type based on school's EA/ED availability:
  - If EA offered → default to EA, else RD
- In profile editing, pre-fill GPA scale to 4.0, pre-select current grade

### Principle 2: Goal Gradient Effect
- Home dashboard: show progress ring that starts at ~15% (account creation counts)
- Profile completion: count sign-up + state selection as already done
- Essay dashboard: "X of Y essays started" with ring showing % toward done
- Application tracker: never show 0% — opening the app is progress

### Principle 3: Reciprocity
- Before sign-in (onboarding page 4), show a REAL preview of what Beacon looks like
  with sample data — a mock school list, a mock essay deadline countdown
- Make sign-in feel like "saving your progress" not "creating an account"
- Show "Your data is ready to save" messaging

### Principle 4: IKEA/Endowment Effect
- During onboarding, let user pick their first school BEFORE signing in
  (add it to local state, sync after auth)
- Let user select their intended major on page 3 (before sign-in)
- Change final onboarding button from "Get Started" to "Save My Progress"

### Principle 5: Loss Aversion
- When a deadline is within 14 days: show "X days left" in red with urgency
- Home dashboard: "You have Y essays due before [earliest deadline]" framing
- After adding a school: "Don't lose your spot — start your essays now" CTA

### Principle 6: Contrast Effect
- School detail page: show net price next to sticker price so net looks small
- Compare view: always show most selective school first as anchor
- On Home, show "Students who don't track deadlines miss 2.3x more" type social proof

---

## 4. ONBOARDING REDESIGN

Current: 6 plain pages (welcome, privacy, data exchange, sign in, state, major)

Redesign as a 5-step interactive flow:

**Page 1 — Hook (not "Welcome to Beacon")**
- Headline: "Most students apply to 12 schools. You'll apply smarter."
- Show animated stats: avg essays written, deadlines missed without tracking
- CTA: "Show me how" (not "Get Started")

**Page 2 — Build value before asking (Reciprocity + IKEA)**
- "Pick your first school" — live search using CollegeScorecardService
- User searches and taps a school — it gets "added" to a local preview list
- Shows acceptance rate, deadlines, essay count for the selected school
- Feels like they've already started — CTA: "Continue building my list"

**Page 3 — Major selection (IKEA effect)**
- "What do you want to study?" — show MajorSelectionView inline (not a sheet)
- Pre-selects Computer Science if user picked a tech school on page 2
- Related majors shown as chips to tap

**Page 4 — Privacy + Data exchange (combined, shorter)**
- Keep it brief: 3 bullet points, no separate page for data exchange
- CTA: "Save My Progress →"

**Page 5 — Sign in**
- Show a mini preview of what their list looks like (the school from page 2)
- "Your school list is ready to save"
- Anonymous auth button: "Save & Continue"
- Small text: "Sign in with Apple coming soon"

---

## 5. LIGHT/DARK MODE TOGGLE

- Add a toggle in Settings (under Profile section)
- Store preference in UserDefaults as "colorScheme" (light/dark/system)
- Apply via `.preferredColorScheme()` modifier on the root WindowGroup
- Default: system (follows device setting)
- The color assets in Assets.xcassets already have light/dark variants

In `BeaconApp.swift`:
```swift
@AppStorage("colorScheme") var colorScheme: String = "system"

var body: some Scene {
    WindowGroup {
        RootView()
            .environment(appViewModel)
            .preferredColorScheme(
                colorScheme == "light" ? .light :
                colorScheme == "dark" ? .dark : nil
            )
    }
}
```

In Settings, add a Picker with three options: System / Light / Dark.

---

## Files Most Likely to Change
- `BeaconApp.swift` — color scheme
- `Features/Onboarding/OnboardingContainerView.swift` — full redesign
- `Core/Services/GeminiService.swift` — unified AI service
- `Core/Services/ResumeParserService.swift` — replace with Gemini
- `Core/ViewModels/AppViewModel.swift` — essay auto-populate fix, majors loading
- `Features/Profile/ActivitiesEditView.swift` — blank page fix
- `Features/Profile/HonorsEditView.swift` — blank page fix
- `Features/Schools/AddSchoolView.swift` — smart defaults
- `Features/Home/HomeView.swift` — loss aversion, goal gradient
- `Features/Settings/SettingsView.swift` — color scheme toggle
- `Resources/Majors.json` — verify it exists and loads

## Do Not Touch
- `SchoolDetailView.swift` — working well
- `EssayEditorView.swift` — working well (just add Gemini swap)
- `LORTrackerView.swift` — just rebuilt
- `FirebaseService.swift` — working well
- `LocalSchoolDataService.swift` — working well
