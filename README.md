# AuditFlow Suite — Real App (Milestone 1)

Next.js 15 (App Router) + TypeScript + Tailwind + Zustand + Dexie + react-hook-form + Zod.

## First-time setup

```bash
cd /home/midhungelli/Downloads/satya/auditflow-app
npm install
npm run dev
```

Then open http://localhost:3000 — root redirects to `/clients`.

## What's implemented (Milestone 1)

- `/clients` — Client Manager (add / switch / delete with confirm) + Active Client Profile (5 cards: Entity ID, Industry/Listing, Reporting Framework + FY, Group Structure, Auditor History + Address)
- `/planning/engagement-acceptance` — B1 / SA 210 (5 cards: Pre-conditions, Independence, Predecessor §139/§140, Engagement Letter, Acceptance Decision) with conditional validation matching HTML demo
- `/planning/resources` — stub ("Coming soon" → Milestone 2)
- IndexedDB persistence via Dexie (`auditflow` DB, tables: `firm`, `clients`)
- Multi-client model: switching clients swaps the entire engagement workspace

## Field naming

HTML demo uses kebab-case DOM IDs (`entity-name`, `current-fy`, `signed-on`).
The TS app uses camelCase consistently (`entityName`, `currentFy`, `signedOn`). See `lib/types.ts`.

## Source-of-truth spec

`/home/midhungelli/Downloads/satya/auditflow-suite.html` — read sections:
- Lines 1392–1668: `panel-client` (B2 — Client Profile)
- Lines 1698–1944: `screen-0` (B1 — Engagement Acceptance)
- Lines 50845–50982: B1 fields list + validation rules
