# Coastal Eats Shift Manager

## Overview
Coastal Eats Shift Manager is a robust scheduling platform designed to handle complex workforce constraints across multiple locations and timezones.

## Key Features & Evaluation Criteria
1. **Constraint Enforcement Engine:** A strict validation engine checking double-bookings, 10h rest periods, location certifications, skill matches, daily/weekly hours (overtime), and consecutive days worked.
2. **Real-Time Concurrency:** Powered by PostgreSQL `LISTEN/NOTIFY` and Server-Sent Events (SSE). When multiple managers edit schedules or assignments, updates stream instantly.
3. **Smart Assist (Secure LLM Tool Calling):** Managers can use natural language to query their locations ("Who can cover a bartender shift tonight?"). Powered by the Vercel AI SDK, utilizing **Tool Calling** to guarantee RBAC and prevent data leaks.
4. **Timezone Accuracy:** All timestamps are `TIMESTAMPTZ`, dynamically formatted into the specific location's timezone.
5. **Partial Shifts:** Tracked via `clock_in_at` and `clock_out_at` on assignments to accurately pay workers who leave early or stay late.

## Tech Stack
- **Framework:** Next.js 14 App Router (React)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Drizzle ORM
- **UI:** shadcn/ui + Tailwind CSS
- **Real-Time:** Native SSE + Postgres Triggers
- **Smart Assist:** Vercel AI SDK (OpenAI)

## Setup Instructions
1. Clone the repository.
2. Create a `.env.local` file with your `DATABASE_URL` and `OPENAI_API_KEY`.
3. Start the local database: `docker-compose up -d`
4. Run migrations and seed: `npm run db:setup` (or manually run `npx drizzle-kit push` and `npx tsx src/seed/index.ts`).
5. Run the dev server: `npm run dev`.

## Ambiguities & Decisions
- **De-certified staff historical data:** Soft-deleted cert (`decertified_at`). Past assignments preserved.
- **Desired hours vs availability:** Availability = hard scheduling constraint. Desired hours = fairness reporting target only.
- **Consecutive days:** Any calendar-day shift counts as a worked day (conservative interpretation).
- **Shift edited post-swap-approval:** Swap auto-cancelled with notification to all parties.
- **Partial shifts (leaving early):** Track actual hours worked via clock-in/out timestamps on the assignment.
- **Location spanning timezone boundary:** Location has one canonical timezone.

## Seed Data Accounts
- **Admin:** admin@coastaleats.com
- **Manager (East):** east.manager@coastaleats.com
- **Manager (West):** west.manager@coastaleats.com
- **Staff (John):** john@coastaleats.com
- **Staff (Sarah):** sarah@coastaleats.com
- **Staff (Maria):** maria@coastaleats.com
