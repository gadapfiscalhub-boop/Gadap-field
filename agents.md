# GADAP Field — Agent Guide

## Project Overview
- **Name:** `gadap-field` (GADAP Field - Canteiro de Obras)
- **Stack:** Next.js 14.2.15 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Purpose:** Offline-first field PWA for construction site supervisors, engineers, and timekeepers.

## Key Files & Structure
- `app/layout.tsx` — Root layout, PWA metadata, Service Worker registration (`/sw.js`).
- `app/page.tsx` — Entry point rendering `FieldDashboardClient`.
- `components/FieldDashboardClient.tsx` — Main field dashboard with bottom navigation (`medicao`, `ponto`, `suprimentos`, `recebimento`, `caixinha`, `wbs`, `campo`, `ajuda`).
- `components/FieldExtrasPanel.tsx` — `Campo+` tab: RDO with GPS-watermarked photo, Web Speech API voice input, digital signature canvas, SST/DDS checklist, RNC occurrences, WhatsApp/Web Share summary.
- `components/HelpPanel.tsx` — In-app Help Center (`ajuda` tab).
- `components/PwaStatusBar.tsx` — Top status bar: Online/Offline indicator, pending sync queue count, `beforeinstallprompt` install button, Sun Mode (high contrast) toggle, Help (`?`) button.
- `components/Toast.tsx` — Toast notification container.
- `lib/offline-queue.ts` — `localStorage`-backed offline action queue (`gadap_field_offline_queue_v1`).
- `public/sw.js` — Service Worker (`gadap-field-v2`) with App Shell precaching, Stale-While-Revalidate for static assets, and Network-First with cache fallback for pages.
- `public/manifest.json` — PWA manifest.

## Commands
- `npm run dev` — Start dev server on port `3001`
- `npm run build` — Production build
- `npx tsc --noEmit` — TypeScript type check
- `npm run lint` — ESLint check

## Conventions
- Keep mobile-first ergonomics (`min-h-[48px]` touch targets).
- Support both dark mode and Sun Mode (`sunMode` prop).
- Preserve offline-first behavior when adding new field actions.
- Always commit completed changes with a clear conventional commit message.
