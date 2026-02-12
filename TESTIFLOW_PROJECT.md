# TestiFlow — Video Testimonial Collector

## Complete Project Specification & Architecture Document

> **Purpose of this document:** This is the single source of truth for building TestiFlow. It is designed to be fed directly to Claude Code as a project spec. Every architectural decision, data model, API endpoint, and component is documented here.

---

## 1. PRODUCT OVERVIEW

### What is TestiFlow?

A web app that lets small businesses collect video testimonials from their clients with zero friction.

### Core User Flow

```
BUSINESS OWNER (User)                    CLIENT (Visitor)
┌─────────────────────┐                  ┌─────────────────────┐
│ 1. Signs up/logs in │                  │                     │
│ 2. Creates a        │                  │                     │
│    "Collection"      │                  │                     │
│ 3. Gets a shareable │───── sends ─────>│ 4. Opens link in    │
│    link              │     link         │    browser          │
│                     │                  │ 5. Sees prompt      │
│                     │                  │    questions         │
│                     │                  │ 6. Hits record       │
│                     │<──── auto ───────│ 7. Reviews & submits│
│ 8. Video appears in │     upload       │                     │
│    dashboard         │                  │ Done. No signup.    │
│ 9. Can embed/share  │                  │ No app download.    │
│    testimonials      │                  │                     │
└─────────────────────┘                  └─────────────────────┘
```

### Key Principle

The CLIENT never signs up, never downloads anything. They click a link, record, done. All friction is on the business owner side (and even that should be minimal).

---

## 2. TECH STACK

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 14+ (App Router) | Single deployable, SSR for collection pages (SEO/social previews), API routes for backend logic |
| **Language** | TypeScript | Type safety across the full stack |
| **Auth + DB** | Supabase | Auth (magic link + OAuth), Postgres DB, Row Level Security |
| **Video Processing** | Mux | Upload, transcode, thumbnail generation, playback via HLS. This is the key decision that avoids the video codec jungle |
| **Email** | Resend | Sending collection link emails to clients |
| **Styling** | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| **Hosting** | Railway | Single service deployment |
| **ORM** | Prisma | Type-safe database access, migrations |

### Why Mux is non-negotiable

Browser video recording outputs inconsistent formats (webm/VP8 on Chrome, mp4/H.264 on Safari). Mux accepts ANY format, transcodes to HLS, generates thumbnails, and provides a player. Without Mux, you'd spend weeks building a transcoding pipeline. With Mux, it's ~10 lines of code.

---

## 3. SYSTEM ARCHITECTURE

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         RAILWAY                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    NEXT.JS APP                              │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │  Dashboard   │  │  Collection  │  │   API Routes    │  │  │
│  │  │  Pages       │  │  Pages       │  │                 │  │  │
│  │  │  (authed)    │  │  (public)    │  │  /api/videos    │  │  │
│  │  │              │  │              │  │  /api/collections│ │  │
│  │  │  /dashboard  │  │  /c/[slug]   │  │  /api/mux-hook  │  │  │
│  │  │  /dashboard/ │  │              │  │  /api/upload     │  │  │
│  │  │   collections│  │              │  │                 │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │  │
│  │         │                 │                    │            │  │
│  └─────────┼─────────────────┼────────────────────┼────────────┘  │
│            │                 │                    │                │
└────────────┼─────────────────┼────────────────────┼────────────────┘
             │                 │                    │
             ▼                 ▼                    ▼
┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   SUPABASE     │  │      MUX         │  │     RESEND       │
│                │  │                  │  │                  │
│  - Auth        │  │  - Direct Upload │  │  - Send email    │
│  - Postgres DB │  │  - Transcode     │  │    with          │
│  - RLS Policies│  │  - Thumbnails    │  │    collection    │
│                │  │  - HLS Playback  │  │    link          │
│                │  │  - Webhooks      │  │                  │
└────────────────┘  └──────────────────┘  └──────────────────┘
```

### Video Upload Flow (The Critical Path)

```
CLIENT BROWSER                NEXT.JS API              MUX                 SUPABASE
     │                            │                     │                      │
     │  1. Click "Record"         │                     │                      │
     │  (MediaRecorder starts)    │                     │                      │
     │                            │                     │                      │
     │  2. Click "Stop"           │                     │                      │
     │  (Blob created)            │                     │                      │
     │                            │                     │                      │
     │  3. POST /api/upload       │                     │                      │
     │  (request upload URL) ────>│                     │                      │
     │                            │  4. Create Direct   │                      │
     │                            │     Upload ────────>│                      │
     │                            │                     │                      │
     │                            │  5. Return upload   │                      │
     │                            │     URL <───────────│                      │
     │                            │                     │                      │
     │  6. Receive upload URL <───│                     │                      │
     │                            │                     │                      │
     │  7. PUT video blob ────────────────────────────>│                      │
     │  (direct to Mux,           │                     │                      │
     │   never hits our server)   │                     │                      │
     │                            │                     │                      │
     │  8. Upload complete         │                     │                      │
     │  POST /api/videos ────────>│                     │                      │
     │  (save metadata)           │                     │  9. Insert video     │
     │                            │                     │     record ─────────>│
     │                            │                     │                      │
     │                            │  10. Webhook:       │                      │
     │                            │  "video.asset.ready"│                      │
     │                            │  <─────────────────│                      │
     │                            │                     │                      │
     │                            │  11. Update video   │                      │
     │                            │      status, save   │                      │
     │                            │      playback_id ──────────────────────────>│
     │                            │                     │                      │
```

**Key insight:** The video blob goes DIRECTLY from the client's browser to Mux. It never passes through our server. No timeouts. No memory issues. No file size limits on our end.

---

## 4. DATABASE SCHEMA (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String       @id @default(uuid())
  email       String       @unique
  name        String?
  avatarUrl   String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  collections Collection[]
}

model Collection {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Display
  name            String            // e.g., "Acme Corp Testimonials"
  slug            String   @unique  // URL-safe identifier for /c/[slug]
  welcomeMessage  String?           // Shown to client before recording
  promptQuestions String[]          // Questions shown to guide the client

  // Branding
  logoUrl         String?
  brandColor      String   @default("#6366f1") // indigo-500

  // Settings
  maxDuration     Int      @default(120)  // max recording seconds
  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  videos          Video[]

  @@index([userId])
  @@index([slug])
}

model Video {
  id              String       @id @default(uuid())
  collectionId    String
  collection      Collection   @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  // Client info (collected before recording)
  clientName      String
  clientEmail     String?
  clientCompany   String?

  // Mux
  muxAssetId      String?      // Mux asset ID
  muxPlaybackId   String?      // Mux playback ID (for embedding)
  muxUploadId     String?      // Mux direct upload ID
  status          VideoStatus  @default(PENDING)
  duration        Float?       // seconds, from Mux webhook
  thumbnailUrl    String?      // auto-generated by Mux

  // Moderation
  approved        Boolean      @default(false)
  featured        Boolean      @default(false)

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([collectionId])
  @@index([status])
}

enum VideoStatus {
  PENDING      // Upload URL created, waiting for upload
  UPLOADING    // Client is uploading
  PROCESSING   // Mux is transcoding
  READY        // Playable
  ERRORED      // Something went wrong
}
```

---

## 5. API ROUTES

### Authentication

Supabase Auth handles this entirely. Use `@supabase/ssr` for Next.js middleware-based auth.

### API Endpoints

```
PROTECTED (require auth via Supabase session):
──────────────────────────────────────────────
GET    /api/collections              → List user's collections
POST   /api/collections              → Create new collection
GET    /api/collections/[id]         → Get collection details + videos
PATCH  /api/collections/[id]         → Update collection settings
DELETE /api/collections/[id]         → Delete collection + all videos

GET    /api/videos                   → List videos (filterable by collection)
PATCH  /api/videos/[id]              → Update video (approve/feature/etc)
DELETE /api/videos/[id]              → Delete video (also delete from Mux)

POST   /api/invite                   → Send collection link via email (Resend)

PUBLIC (no auth required):
──────────────────────────────────────────────
GET    /api/collections/public/[slug] → Get collection info for recording page
POST   /api/upload                    → Request Mux direct upload URL
POST   /api/videos                    → Save video metadata after upload
                                        (validated by muxUploadId)

WEBHOOK:
──────────────────────────────────────────────
POST   /api/webhooks/mux              → Mux webhook handler
                                        Handles: video.asset.ready
                                                 video.asset.errored
                                                 video.upload.asset_created
```

---

## 6. PAGE ROUTES & COMPONENTS

### Page Structure

```
app/
├── (auth)/
│   ├── login/page.tsx                → Login (magic link + Google OAuth)
│   └── callback/route.ts            → Supabase auth callback
│
├── (dashboard)/
│   ├── layout.tsx                    → Dashboard shell (sidebar + topbar)
│   ├── dashboard/
│   │   ├── page.tsx                  → Overview (total videos, recent activity)
│   │   ├── collections/
│   │   │   ├── page.tsx              → List all collections
│   │   │   ├── new/page.tsx          → Create collection form
│   │   │   └── [id]/
│   │   │       ├── page.tsx          → Collection detail (video grid)
│   │   │       ├── settings/page.tsx → Edit collection
│   │   │       └── embed/page.tsx    → Get embed codes
│   │   └── videos/
│   │       └── [id]/page.tsx         → Single video view + approve/delete
│
├── c/
│   └── [slug]/
│       └── page.tsx                  → PUBLIC: Client-facing recording page
│
├── api/
│   ├── collections/
│   │   ├── route.ts                  → GET (list) + POST (create)
│   │   ├── [id]/route.ts            → GET + PATCH + DELETE
│   │   └── public/[slug]/route.ts   → GET (public collection info)
│   ├── videos/
│   │   ├── route.ts                  → GET (list) + POST (create metadata)
│   │   └── [id]/route.ts            → PATCH + DELETE
│   ├── upload/route.ts              → POST (get Mux upload URL)
│   ├── invite/route.ts             → POST (send email)
│   └── webhooks/
│       └── mux/route.ts             → POST (Mux webhook)
│
├── layout.tsx                        → Root layout
└── page.tsx                          → Landing page / marketing
```

### Key Components

```
components/
├── ui/                               → shadcn/ui components
├── dashboard/
│   ├── sidebar.tsx                   → Navigation sidebar
│   ├── collection-card.tsx           → Collection preview card
│   ├── video-card.tsx                → Video thumbnail + status + actions
│   ├── video-player.tsx              → Mux player wrapper
│   ├── stats-overview.tsx            → Dashboard stats
│   └── embed-code-generator.tsx      → Generate iframe/script embed
│
├── recording/
│   ├── recording-page.tsx            → Full client-facing recording experience
│   ├── camera-preview.tsx            → Live camera feed
│   ├── recording-controls.tsx        → Record/stop/retake buttons
│   ├── video-review.tsx              → Preview before submit
│   ├── client-info-form.tsx          → Name/email/company form
│   └── prompt-display.tsx            → Show prompt questions
│
├── collections/
│   ├── collection-form.tsx           → Create/edit collection form
│   ├── share-link.tsx                → Copy link + QR code
│   └── collection-settings.tsx       → Settings panel
│
└── shared/
    ├── logo.tsx
    ├── loading-spinner.tsx
    └── empty-state.tsx
```

---

## 7. KEY IMPLEMENTATION DETAILS

### 7.1 Browser Video Recording

```typescript
// This is the core recording logic for components/recording/camera-preview.tsx
// Use the MediaRecorder API with fallbacks

const getMediaRecorderOptions = (): MediaRecorderOptions => {
  // Prefer mp4 (Safari), fall back to webm (Chrome/Firefox)
  // Mux handles both, so this is just for efficiency
  if (MediaRecorder.isTypeSupported('video/mp4')) {
    return { mimeType: 'video/mp4' };
  }
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    return { mimeType: 'video/webm;codecs=vp9' };
  }
  if (MediaRecorder.isTypeSupported('video/webm')) {
    return { mimeType: 'video/webm' };
  }
  return {}; // Let browser decide
};

// IMPORTANT: Request camera with constraints for quality vs file size
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
});
```

### 7.2 Mux Direct Upload

```typescript
// API Route: /api/upload/route.ts
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: Request) {
  const { collectionId, clientName } = await req.json();

  // Create a direct upload — returns a URL the client uploads to
  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL,
    new_asset_settings: {
      playback_policy: ['public'],
      encoding_tier: 'baseline', // cheaper, fine for testimonials
    },
  });

  return Response.json({
    uploadUrl: upload.url,        // Client PUTs video blob here
    uploadId: upload.id,          // Track which upload this is
  });
}
```

### 7.3 Mux Webhook Handler

```typescript
// API Route: /api/webhooks/mux/route.ts
import { headers } from 'next/headers';
import Mux from '@mux/mux-node';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();

  // Verify webhook signature (IMPORTANT for security)
  // Use Mux.Webhooks.verifySignature() in production

  const event = JSON.parse(body);

  switch (event.type) {
    case 'video.upload.asset_created': {
      // Link the Mux asset to our upload record
      const { upload_id, asset_id } = event.data;
      await prisma.video.updateMany({
        where: { muxUploadId: upload_id },
        data: {
          muxAssetId: asset_id,
          status: 'PROCESSING',
        },
      });
      break;
    }

    case 'video.asset.ready': {
      // Video is transcoded and ready to play
      const asset = event.data;
      const playbackId = asset.playback_ids?.[0]?.id;

      await prisma.video.updateMany({
        where: { muxAssetId: asset.id },
        data: {
          status: 'READY',
          muxPlaybackId: playbackId,
          duration: asset.duration,
          thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.png`,
        },
      });
      break;
    }

    case 'video.asset.errored': {
      await prisma.video.updateMany({
        where: { muxAssetId: event.data.id },
        data: { status: 'ERRORED' },
      });
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
```

### 7.4 Supabase Auth Setup

```typescript
// middleware.ts — protect dashboard routes
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // cookie handling for Next.js
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## 8. ENVIRONMENT VARIABLES

```env
# .env.local

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database (Supabase Postgres connection string)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Mux
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_mux_webhook_signing_secret

# Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## 9. RAILWAY DEPLOYMENT

### railway.json

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Deployment Checklist

1. Create Railway project
2. Add a **Postgres database** service in Railway (use this instead of Supabase Postgres if you prefer — but we still need Supabase for Auth)
3. Set all environment variables in Railway dashboard
4. Connect GitHub repo for auto-deploys
5. Set up custom domain (needed for Mux CORS origin)
6. Configure Mux webhook URL: `https://yourdomain.com/api/webhooks/mux`

---

## 10. BUILD ORDER (for Claude Code)

Follow this exact order. Each phase should be working before moving to the next.

### Phase 1: Foundation
```
1. Initialize Next.js 14+ with TypeScript, Tailwind, App Router
2. Install dependencies:
   - @supabase/ssr @supabase/supabase-js
   - @mux/mux-node @mux/mux-player-react
   - prisma @prisma/client
   - resend
   - nanoid (for generating slugs)
   - shadcn/ui components (button, input, card, dialog, badge, toast)
3. Set up Prisma schema (copy from Section 4)
4. Run initial migration
5. Set up Supabase auth (middleware + login page)
6. Create basic dashboard layout with sidebar
```

### Phase 2: Collections CRUD
```
1. Create collection form (name, prompt questions, branding)
2. API routes for collections CRUD
3. Collection list page
4. Collection detail page
5. Generate unique slugs with nanoid
6. Share link component (copy to clipboard)
```

### Phase 3: Recording Page (THE CRITICAL PATH)
```
1. Public page at /c/[slug]
2. Fetch collection info (welcome message, prompts, branding)
3. Client info form (name, email, company)
4. Camera permission + preview
5. Recording controls (record, stop, timer showing max duration)
6. Video review (play back before submitting)
7. Request Mux upload URL from our API
8. Upload blob directly to Mux
9. Save video metadata to our DB
10. Success state
```

### Phase 4: Video Management
```
1. Mux webhook handler
2. Video grid on collection detail page
3. Video player using @mux/mux-player-react
4. Approve/reject/feature actions
5. Delete video (also delete Mux asset)
```

### Phase 5: Polish
```
1. Dashboard overview stats
2. Email invitations via Resend
3. Embed code generator (iframe snippet)
4. Empty states
5. Loading states
6. Error handling
7. Mobile responsive recording page (CRITICAL — clients will use phones)
8. QR code for collection links
```

---

## 11. KNOWN GOTCHAS & LANDMINES

These are the traps. Address each one explicitly:

| # | Gotcha | Solution |
|---|--------|----------|
| 1 | Safari MediaRecorder support is spotty on older iOS | Check `navigator.mediaDevices` support, show clear error message. iOS 14.3+ is required. |
| 2 | Camera permission denied = dead end | Show clear instructions for re-enabling. Don't just fail silently. |
| 3 | Large video uploads failing | Mux direct upload handles this. Video never touches our server. |
| 4 | Mux webhook not reaching local dev | Use `ngrok` or `mux-cli` for local webhook testing. Add instructions in README. |
| 5 | CORS errors on Mux upload | `cors_origin` in Mux upload creation MUST match your domain exactly. |
| 6 | Supabase RLS blocking queries | User table sync: create a Supabase trigger that inserts into our User table when auth.users gets a new row. |
| 7 | Video plays on desktop but not mobile | Use Mux Player (`@mux/mux-player-react`), not a raw `<video>` tag. It handles HLS/format negotiation. |
| 8 | Recording page looks broken on mobile | Test on real devices. Camera preview needs `playsInline` and `muted` attributes. |
| 9 | Slug collisions | Use nanoid with sufficient length (10+ chars). Check uniqueness before insert. |
| 10 | Webhook replay / duplicate events | Make webhook handler idempotent. Use `updateMany` with where clause, not create. |

---

## 12. SECURITY CONSIDERATIONS

- **RLS Policies:** Users can only access their own collections and videos. Public endpoints only expose collection display info, never user data.
- **Mux Webhook Verification:** Always verify the webhook signature in production using the MUX_WEBHOOK_SECRET.
- **Rate Limiting:** Add rate limiting to `/api/upload` to prevent abuse (someone spamming video uploads on a public collection link).
- **Input Validation:** Validate all inputs with Zod schemas on API routes.
- **CORS:** Lock down Mux upload CORS to your domain only.

---

## 13. FUTURE ENHANCEMENTS (NOT IN MVP)

These are explicitly OUT OF SCOPE for the initial build:

- Wall of Love page (public testimonial showcase)
- Text testimonials (video only for MVP)
- Custom branding themes
- Analytics (views, completion rates)
- Zapier/webhook integrations
- Team accounts / multi-user
- Custom domains per collection
- AI-generated highlights/clips
- Stripe billing

---

## 14. QUICK REFERENCE: EXTERNAL DOCS

- **Mux Direct Uploads:** https://docs.mux.com/guides/direct-upload
- **Mux Webhooks:** https://docs.mux.com/guides/listen-for-webhooks
- **Mux Player React:** https://docs.mux.com/guides/mux-player-react
- **Supabase Auth + Next.js:** https://supabase.com/docs/guides/auth/server-side/nextjs
- **Prisma + Supabase:** https://supabase.com/docs/guides/database/prisma
- **Resend + Next.js:** https://resend.com/docs/send-with-nextjs
- **MediaRecorder API:** https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

---

*This document was designed to be comprehensive enough that Claude Code can build the entire application from it. Every architectural decision has been made. The build order is explicit. The gotchas are documented. Go build it.*