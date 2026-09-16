# Coastal Eats Shift Manager

> Multi-location staff scheduling platform for Coastal Eats restaurant group.

---

## Quick Links

| Document | Purpose |
|---|---|
| [README.md](README.md) | Developer setup and architecture reference |
| [USER_MANUAL.md](USER_MANUAL.md) | Step-by-step guide for managers and staff |

---

## Overview

The Coastal Eats Shift Manager is a web-based scheduling platform that handles workforce scheduling across **4 locations** in **2 time zones** (Eastern and Pacific). It solves the core operational pain points:

- Staff calling out with no coverage path
- Overtime costs spiralling from poor visibility
- Unfair shift distribution between employees
- Managers at different locations competing for the same staff
- No central view of who is working where and when

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| UI | shadcn/ui + Tailwind CSS |
| Real-Time | Server-Sent Events + PostgreSQL triggers |
| Smart Assist | Vercel AI SDK (OpenAI GPT-4 Turbo) |
| Deployment | Vercel (frontend) + Supabase (database) |

---

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Docker Desktop (for the local Postgres database)
- A Supabase account (for production) OR Docker (for local dev)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd int
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase dashboard > Settings > Database > Connection string. Use the **Transaction** mode URL (port 6543). |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |

For **local development only**, you can use the bundled Docker Postgres instead:

```bash
docker-compose up -d
# Then set DATABASE_URL=postgresql://root:password@localhost:5432/shiftsync
```

### 3. Run database migrations and seed

```bash
npm run db:setup
```

This runs migrations first (creates all tables), then seeds the database with realistic test data including all 4 locations, 3 staff members, 2 managers, and an admin account.

Individual scripts:
```bash
npm run db:migrate   # Apply schema migrations only
npm run db:seed      # Populate seed data only
npm run db:generate  # Re-generate migration files after schema changes
```

### 4. Start the development server

```bash
npm run dev
```

Open http://localhost:3000. You will be redirected automatically to the manager schedule view.

---

## Seed Accounts

Use these credentials to test different roles. (Authentication is the next phase; currently the role is set in the session.)

| Name | Email | Role |
|---|---|---|
| System Admin | admin@coastaleats.com | Admin |
| East Manager | east.manager@coastaleats.com | Manager (Downtown, Westside) |
| West Manager | west.manager@coastaleats.com | Manager (Marina, Valley) |
| John Doe | john@coastaleats.com | Staff (Downtown, Bartender) |
| Sarah Smith | sarah@coastaleats.com | Staff (Downtown + Westside, Server) |
| Maria Garcia | maria@coastaleats.com | Staff (Marina, Line Cook + Bartender) |

---

## Locations

| Name | Timezone |
|---|---|
| Downtown | America/New_York (ET) |
| Westside | America/New_York (ET) |
| Marina | America/Los_Angeles (PT) |
| Valley | America/Los_Angeles (PT) |

---

## Project Structure

```
src/
  app/
    (dashboard)/          # All authenticated dashboard pages
      layout.tsx          # Shared sidebar + header layout
      manager/
        schedule/         # Weekly schedule grid
        analytics/        # Overtime, fairness, live duty
        assist/           # Smart Assist AI chat
      staff/
        schedule/         # My upcoming shifts
        availability/     # Set recurring hours and time-off
        swaps/            # Swap requests and shift pick-ups
    api/
      assignments/check/  # POST - runs constraint engine
      chat/               # POST - Smart Assist AI route
      events/             # GET  - SSE stream (real-time updates)
  components/
    analytics/            # OvertimeDashboard, FairnessReport, OnDutyNow
    assist/               # ChatPanel
    schedule/             # WeekGrid, ShiftModal, AssignmentModal
    ui/                   # shadcn/ui base components
  hooks/
    useSSE.ts             # React hook for EventSource connection
  lib/
    ai/tools.ts           # Secure LLM tool definitions (RBAC enforced)
    constraints/          # The constraint engine
      checkers.ts         # 8 individual constraint functions
      engine.ts           # Orchestrator that runs all checks in parallel
      suggestions.ts      # Finds qualified alternative staff
      types.ts            # TypeScript types
    db/
      schema.ts           # Drizzle ORM schema (12 tables)
      client.ts           # Database connection
      migrate.ts          # Migration runner
      triggers.sql        # PostgreSQL LISTEN/NOTIFY triggers
  seed/
    index.ts              # Realistic seed data script
```

---

## Constraint Engine Rules

Every assignment is evaluated against these 8 rules before it can be confirmed:

| Rule | Severity | Threshold |
|---|---|---|
| Double Booking | Block | Any overlap |
| Minimum Rest Period | Block | Less than 10 hours between shifts |
| Skill Match | Block | Missing required skill |
| Location Certification | Block | Not certified for that location |
| Availability | Block | Outside declared hours or marked unavailable |
| Daily Hours | Warn at 8h, Block at 12h | |
| Weekly Hours | Warn at 35h, Block at 40h | |
| Consecutive Days | Warn at 6 days, Block at 7 days | |

When a Block constraint fires, the engine automatically queries for qualified alternative staff and includes them in the response.

---

## Real-Time Architecture

```
[Manager Action] --> [Drizzle ORM Write] --> [PostgreSQL]
                                                |
                                    [trigger: notify 'db_changes']
                                                |
                                    [/api/events SSE endpoint]
                                                |
                                    [EventSource in browser]
                                                |
                                    [UI refreshes affected component]
```

---

## Known Limitations and Ambiguity Decisions

| Ambiguity | Decision Made |
|---|---|
| Staff de-certified from a location | Soft delete: `decertified_at` timestamp set. Historical assignments preserved. |
| Desired hours vs availability | Availability is a hard scheduling constraint. Desired hours are used for fairness reporting only. |
| Consecutive days: does a 1-hour shift count? | Yes. Any shift on a calendar day counts as a worked day (conservative approach). |
| Shift edited after swap approval | Swap is auto-cancelled and all parties notified. |
| Location spanning a timezone boundary | Location has one canonical timezone. Edge case noted in documentation. |
| Overnight shifts (e.g. 11pm to 3am) | Stored as a single record with endAt > startAt. Constraint engine handles naturally. |

---

## Deployment to Vercel

1. Push the repository to GitHub.
2. In the Vercel dashboard, import the repository.
3. Set the environment variables (`DATABASE_URL`, `OPENAI_API_KEY`) in Vercel project settings.
4. Vercel will auto-detect Next.js and deploy.
5. After first deployment, run `npm run db:setup` pointed at your production Supabase URL to initialise the database.

> Note: Vercel is required (not Cloudflare Workers) because the constraint engine requires more than 10ms of CPU time per request.

---

## Evaluation Scenario Answers

**1. Sunday Night Chaos (Staff calls out at 6pm for 7pm shift)**
Navigate to Schedule > find the shift > click Unassign. The system immediately triggers `getCoverageSuggestions`, showing qualified staff ordered by fewest hours this week. Click one name, the constraint engine validates in real time, and the assignment is confirmed. The new staff member receives an in-app notification.

**2. The Overtime Trap**
Before the manager can confirm a shift that pushes someone past 40h, the weekly hours checker fires a Block. The error message states the projected total (e.g. "Weekly hours would exceed 40 (42.5h)"). The suggestions list shows who else can cover without hitting overtime.

**3. The Timezone Tangle**
The system stores all timestamps as `TIMESTAMPTZ`. When checking availability, the shift time is converted to the location's canonical timezone before comparison against the staff member's availability window. A staff member available 9am-5pm ET cannot be booked for a 4pm-midnight ET shift, even if that shift looks different from a PT perspective.

**4. Simultaneous Assignment**
Both managers submit at the same time. One POST request succeeds and writes to the database. The second POST runs the double-booking check which now sees the first assignment, fires a Block, and returns an error to the second manager in real time via SSE.

**5. The Fairness Complaint**
Navigate to Analytics > Fairness Report. The report shows the distribution of Friday/Saturday evening premium shifts per staff member over the selected period, with a fairness score. If a staff member has a low score they are under-represented.

**6. The Regret Swap**
Staff A submitted the swap request. Before manager approval, Staff A can cancel it from the Swaps page. The swap status changes to `cancelled` and Staff B is notified. The original assignment remains unchanged.
