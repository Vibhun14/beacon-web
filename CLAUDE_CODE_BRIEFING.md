# Beacon iOS — Claude Code Briefing

## Mission
Port features from the Beacon web app (React/TypeScript at beacon.college) to the
existing Beacon iOS app (SwiftUI/iOS 17+). They share the same Firebase project and
Firestore database — data must sync between web and iOS.

## iOS Stack
- SwiftUI + @Observable (iOS 17+)
- Firebase Auth (anonymous for now, Sign in with Apple before launch)
- Firestore (shared with web)
- College Scorecard API (live school search)
- collegedata.fyi PostgREST API (CDS stats, no key needed)
- Claude API (resume parser, AI assistant)
- Gemini API (supplemental prompt generation)

## iOS Project Structure
```
Beacon/
├── BeaconApp.swift              # @main, FirebaseApp.configure() in init()
├── Core/
│   ├── Models/                  # Codable structs: School, Essay, BeaconUser, etc.
│   ├── ViewModels/AppViewModel.swift  # @Observable, single source of truth
│   ├── Services/                # Firebase, Auth, CollegeScorecard, LocalSchoolData
│   └── Extensions/
├── Features/
│   ├── Onboarding/              # 6-page flow: welcome→privacy→data→signin→state→major
│   ├── Home/                    # Dashboard: stats, deadlines, priority essays
│   ├── Profile/                 # Academics, Activities, Honors, Research, Resume upload
│   ├── Schools/                 # List, Detail (6 sections), AddSchool, Compare, MajorExplorer
│   ├── Essays/                  # Dashboard, Editor (autosave), SimilarityView
│   ├── Tracker/                 # ApplicationTracker, LORTracker, ApplicationDetail
│   ├── Community/               # Placeholder
│   └── Settings/
└── Shared/
    ├── Components/              # BeaconCard, BeaconButton, BeaconTextField, StatusBadge, etc.
    └── Theme/                   # BeaconColors, BeaconTypography, BeaconTheme (spacing/radius)
```

## Firestore Schema (shared web + iOS)
```
users/{userId}
  └── schools/{schoolId}         # School objects saved per user

applications/{appId}             # SchoolApplication: tier, type, status, lors[], essayIds[]
essays/{essayId}                 # Essay: prompt, content, status, schoolId, deadline, versions[]
community/{postId}               # Anonymous post-decision profiles
```

## Key iOS Patterns
```swift
// Global state — inject via .environment(appVM)
@Observable final class AppViewModel {
    var schools: [School] = []
    var applications: [SchoolApplication] = []
    var essays: [Essay] = []
    // All CRUD goes through appVM methods
}

// All views read from appVM
@Environment(AppViewModel.self) private var appVM
```

## What's Built (DO NOT REBUILD)
- Full onboarding flow (6 pages)
- School search via College Scorecard API with live results
- School Detail view (6 tabs: Overview, Admissions, Essays, Research, Outcomes, Campus)
- Essay Dashboard with priority sorting + similarity grouping
- Essay Editor with autosave, version history
- Application Tracker + LOR Tracker with per-school detail
- Profile editing (academics, activities drag-reorder, honors, research, work, resume upload)
- Settings with school data refresh

## What Needs Porting from Web
Read the web source first, then port these in order:
1. **schools.json** — Copy web app's complete school database directly into iOS Resources/Schools.json
2. **Kanban board** — Essay status as drag-and-drop columns (Ideas/Draft/Editing/Final/Submitted)
3. **Calendar view** — Deadline calendar showing EA/ED/RD dates across all schools
4. **Chancing calculator** — Honest percentile math vs CDS data (no false precision)
5. **Community tab** — Anonymous post-decision profiles, filterable by school/major/stats
6. **Any features in web not yet in iOS**

## Shared Firestore Rules
```javascript
// Users own their data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  match /schools/{schoolId} { allow read, write: if request.auth.uid == userId; }
}
match /applications/{appId} {
  allow read, write: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
}
match /essays/{essayId} {
  allow read, write: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
}
match /community/{postId} {
  allow read: if request.auth != null;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}
```

## iOS Conventions to Follow
- No em dashes in UI text
- BeaconButton, BeaconCard, BeaconSection, TagChip, StatusBadge for all UI
- Colors: beaconPrimary (blue), beaconSecondary (purple), beaconAccent (orange)
- Spacing: BeaconTheme.Spacing.sm/md/lg/xl/xxl/xxxl
- Corner radius: BeaconTheme.Radius.sm/md/lg
- All saves go through AppViewModel methods, never directly to FirebaseService
- @MainActor on all AppViewModel state-mutating methods
- Use `try?` when saving (don't crash on network errors)

## Web → iOS Translation Notes
- React useState → @State
- React useEffect → .onAppear / .task
- Tailwind classes → BeaconTheme constants
- React Router → NavigationStack + NavigationLink
- Zustand/Context → AppViewModel @Environment
- fetch() → URLSession.shared.data(for:)
- TypeScript interface → Swift struct: Codable, Identifiable
