# Personal Anything Notifier

Stack: Next.js (App Router) + Inngest + Supabase + Vercel

Core idea: Users create notifications with a `query` and optional `schedule_cron`. An Inngest poller finds due notifications, schedules an instance to run at `next_run_at`, and each run creates a `jobs` row, executes, and computes the next run.

## Setup

1. Copy env template
```bash
cp .env.local.example .env.local
```

2. Fill Supabase and Inngest keys in `.env.local`.
   - Optional: `OPENAI_API_KEY` to infer `schedule_cron` when not provided.

3. Provision database schema
```sql
-- Run in Supabase SQL editor
-- File: supabase/schema.sql
```

4. Install deps and run dev
```bash
pnpm i # or npm i / yarn
pnpm dev
```

5. Inngest serve route
Expose `src/app/api/inngest/route.ts` on Vercel. In development, the Next server hosts it.

## Key Files

- `supabase/schema.sql` – tables and indexes (`pan_users`, `pan_notifications`, `pan_jobs`)
- `src/lib/supabase/server.ts` – admin client
- `src/lib/inngest/client.ts` – Inngest client
- `src/lib/inngest/functions/*` – poller, scheduler, runner
- `src/app/api/inngest/route.ts` – Inngest serve endpoint
- `src/app/api/notifications/route.ts` – create notifications API
- `src/lib/openai/service.ts` – infers `schedule_cron` from the user's query (OpenAI)
- `src/app/page.tsx` – simple UI

## Notes

- Cron support uses `cron-parser` and computes `next_run_at` after each run.
- `poller` marks items via a scheduler function which sets `is_next_run_scheduled` to prevent duplicates.
- Replace the runner execution with your real logic to act on `query`.


