# Beacon Web

College application organizer — web companion to Beacon iOS.

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- Firebase Auth + Firestore
- Supabase (enrichment layer)
- College Scorecard API
- Deployed on Vercel

## Setup

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your Firebase, Supabase, and College Scorecard keys

# 3. Run locally
npm run dev

# 4. Build
npm run build
```

## Deploy to Vercel

```bash
npx vercel --prod
```

Add all `.env` variables in Vercel Dashboard → Project → Settings → Environment Variables.

## Firestore Collections

| Collection | Description |
|------------|-------------|
| `schools`  | Schools on user's list |
| `essays`   | Essay prompts + status |
| `lors`     | LOR recommenders + status |

## Firebase Security Rules (paste into Firestore Rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```
