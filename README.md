# Coastal Eats Shift Manager

> Live demo: **DEPLOYMENT_URL** (set after `vercel deploy`; see Deployment below)

Multi-location staff scheduling platform for Coastal Eats restaurant group.

## Quick Links

| Document | Purpose |
|---|---|
| README.md | Developer setup and architecture reference |
| USER_MANUAL.md | Step-by-step guide for managers and staff |

## Overview

The Coastal Eats Shift Manager is a web-based scheduling platform that handles workforce scheduling across **4 locations** in **2 time zones** (Eastern and Pacific). It solves the core operational pain points:

- Staff calling out with no coverage path
- Overtime costs spiralling from poor visibility
- Unfair shift distribution between employees
- Managers at different locations competing for the same staff
- No central view of who is working where and when

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| UI | shadcn/ui + Tailwind CSS |
| Real-Time | Server-Sent Events + PostgreSQL triggers |
| Smart Assist | Vercel AI SDK + NVIDIA NIM (deepseek-ai/deepseek-v4-flash-0731) |
| Deployment | Vercel (frontend) + Supabase (database) |

### Why NVIDIA NIM and not the OpenAI API

This project was built against the **NVIDIA NIM API** (`integrate.api.nvidia.com`) because of token constraints on the OpenAI API. The AI SDK's OpenAI-compatible client (`createOpenAI`) points at the NIM baseURL with an `NVIDIA_API_KEY`. Coverage suggestions never depend on the model either way: they come from the deterministic constraint engine, and Smart Assist degrades gracefully without any key (see AI Disclosure).

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- A [Supabase](https://supabase.com) account (for the PostgreSQL database)

### 1. Clone and install

```bash
git clone https://github.com/llakterian/ShiftSync.git
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
| `NVIDIA_API_KEY` | https://build.nvidia.com (required only for Smart Assist AI answers; the rest of the app works without it) |

### 3. Run database migrations and seed

```bash
npm run db:setup
```

This runs migrations first (creates all tables), then seeds the database. The seed is **idempotent** (safe to re-run) and includes:

- 12 users: admin, 2 managers (East owns Downtown + Westside, West owns Marina + Valley), 9 staff
- **Ana Torres**: the cross-timezone bartender, certified at Downtown (ET) AND Marina (PT), with 9am to 5pm availability windows in each location's local time
- Recurring availability windows for all staff
- A **pre-existing conflict schedule**: Mike Turner is double-booked Friday evening (Downtown 17:00 to 01:00 AND Westside 18:00 to 00:00, both published)

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

Open http://localhost:3000. You will land on the persona picker: choose System Admin, East Manager, or Staff Member (one click, no credentials). You are redirected to the manager schedule view.

## Seed Accounts

| Name | Email | Role |
|---|---|---|
| System Admin | admin@coastaleats.com | Admin |
| East Manager | east.manager@coastaleats.com | Manager (Downtown, Westside) |
| West Manager | west.manager@coastaleats.com | Manager (Marina, Valley) |
| Ana Torres | ana@coastaleats.com | Staff (Downtown + Marina, Bartender) |
| John Doe | john@coastaleats.com | Staff (Downtown, Bartender) |
| Sarah Smith | sarah@coastaleats.com | Staff (Downtown + Westside, Server) |
| Maria Garcia | maria@coastaleats.com | Staff (Marina, Line Cook + Bartender) |

(Authentication is the next phase; currently the role is set by the persona picker cookie. All three roles are one click away at `/`.)

## Locations

| Name | Timezone |
|---|---|
| Downtown | America/New_York (ET) |
| Westside | America/New_York (ET) |
| Marina | America/Los_Angeles (PT) |
| Valley | America/Los_Angeles (PT) |

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
        assignments/      # Staff roster and skills
      staff/
        schedule/         # My upcoming shifts
        availability/     # Set recurring hours and time-off (live)
        swaps/            # Swap requests and shift pick-ups (live)
    api/
      assignments/check/  # POST - runs constraint engine (dry-run)
      assignments/confirm/# POST - confirms with DB-level concurrency guard
      availability/       # GET/POST - recurring windows + overrides
      chat/               # POST - Smart Assist AI route (NVIDIA NIM)
      events/             # GET  - SSE stream (real-time updates)
      locations/          # GET  - locations + skills
      my-shifts/          # GET  - logged-in staff upcoming shifts
      on-duty/            # GET  - currently clocked-in staff
      schedule/publish/   # POST - publish/unpublish a week
      shifts/             # GET/POST - week view + timezone-correct creation
      swaps/              # GET  - drop board + my requests
      swaps/claim/        # POST - pick up a dropped shift
      swaps/requests/     # POST - create swap/drop request
      swaps/cancel/       # POST - cancel own pending request
  components/
    analytics/            # OvertimeDashboard, FairnessReport, OnDutyNow
    assist/               # ChatPanel
    schedule/             # WeekGrid, ShiftModal, ScheduleActions
    staff/                # MyShiftsList, SwapsBoard, AvailabilityManager
    ui/                   # shadcn/ui base components
  hooks/
    useSSE.ts             # React hook for EventSource connection
  lib/
    ai/tools.ts           # Real DB-backed LLM tool definitions
    constraints/          # The constraint engine
      checkers.ts         # 8 individual constraint functions
      engine.ts           # Orchestrator that runs all checks in parallel
      suggestions.ts      # Finds qualified alternative staff
      types.ts            # TypeScript types
    db/
      schema.ts           # Drizzle ORM schema
      client.ts           # Database connection
      options.ts          # Supabase pooler/listen connection handling
      migrate.ts          # Migration runner
      triggers.sql        # PostgreSQL LISTEN/NOTIFY triggers
  seed/
    index.ts              # Idempotent seed data script
```

## Constraint Engine Rules

Every assignment is evaluated against these 8 rules before it can be confirmed:

| Rule | Severity | Threshold |
|---|---|---|
| Double Booking | Block | Any overlap |
| Minimum Rest Period | Block | Less than 10 hours between shifts |
| Skill Match | Block | Missing required skill |
| Location Certification | Block | Not certified for that location |
| Availability | Block | Outside declared hours or marked unavailable |
| Daily Hours | Warn at 8h | Block at 12h |
| Weekly Hours | Warn at 35h | Never a hard block (overtime cost is the manager's call) |
| Consecutive Days | Warn at 6 days | Override with documented reason at 7 days |

When a Block constraint fires, the engine automatically queries for qualified alternative staff and includes them in the response. A 7th consecutive day returns `override_required` and the confirm step collects a documented reason that lands in the audit trail.

### Concurrency at the database level

Application-level checks race when two managers assign the same staff at the same moment. The confirm endpoint (`/api/assignments/confirm`) serializes the decision inside a single transaction:

```
BEGIN;
  pg_advisory_xact_lock(hashtext(userId));  -- one writer per staff member
  re-run the full constraint engine;        -- reads committed state
  insert the assignment;                    -- commit releases the lock
COMMIT;
```

The second concurrent request blocks on the advisory lock until the first transaction commits, then its fresh engine run sees the new assignment and returns the double-booking block. One succeeds, one gets a clear error.

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

## AI Disclosure

Smart Assist is powered by NVIDIA NIM (deepseek-ai/deepseek-v4-flash-0731) via the Vercel AI SDK. What the AI does and does not do:

- The model answers natural-language questions using **tools that query the real database**: available staff and overtime risks are always real data, never invented.
- Coverage suggestions are a **deterministic constraint-engine query** (`getCoverageSuggestions`), never an OpenAI or model call.
- **Without an API key**, Smart Assist degrades gracefully: it explains offline mode and points to the deterministic paths (constraint checks on the schedule, Overtime Risk panel). The rest of the app is fully functional without a key.
- The model has no access to anything outside the scheduling tools; it cannot mutate data.

## Known Limitations and Ambiguity Decisions

| Ambiguity | Decision Made |
|---|---|
| Staff de-certified from a location | Soft delete: `decertified_at` timestamp set. Historical assignments preserved. |
| Desired hours vs availability | Availability is a hard scheduling constraint. Desired hours are used for fairness reporting only. |
| Consecutive days: does a 1-hour shift count? | Yes. Any shift on a calendar day counts as a worked day (conservative approach). |
| Shift edited after swap approval | Swap is auto-cancelled and all parties notified. |
| Location spanning a timezone boundary | Location has one canonical timezone. Edge case noted in documentation. |
| Overnight shifts (e.g. 11pm to 3am) | Stored as a single record with endAt > startAt. Constraint engine handles naturally. |
| NIM latency (15 to 50s per model leg) | Smart Assist keeps the user informed ("Calling database...") while tools run; Vercel Hobby `maxDuration` is 60s. |

## Deployment to Vercel

1. Push the repository to GitHub.
2. In the Vercel dashboard, import the repository.
3. Set the environment variables (`DATABASE_URL`, `NVIDIA_API_KEY`) in Vercel project settings.
4. Vercel will auto-detect Next.js and deploy.
5. After first deployment, run `npm run db:setup` pointed at your production Supabase URL to initialise the database.

> Note: Vercel is required (not Cloudflare Workers) because the SSE endpoint needs a persistent Node runtime, and the constraint engine requires more than 10ms of CPU time per request.

## Evaluation Scenario Answers

**1. Sunday Night Chaos (Staff calls out at 6pm for 7pm shift)**
Navigate to Schedule > find the shift > open it. The constraint engine runs in real time on any candidate and returns qualified suggestions (from `getCoverageSuggestions`, a deterministic DB query) ordered by fewest hours this week. Confirm the replacement via `/api/assignments/confirm`: the engine re-validates inside the transaction, the assignment is committed, and the new staff member receives an in-app notification.

**2. The Overtime Trap**
A shift that pushes someone past 40h fires a **warning, not a block** (spec: weekly hours warns at 35+). The message states the projected total (e.g. "Weekly hours would exceed 40 (42.5h). Overtime cost impact: confirm only if intentional."). The manager sees the cost and decides. The suggestions list shows who else can cover without hitting overtime.

**3. The Timezone Tangle**
All timestamps are `TIMESTAMPTZ`. Shift creation resolves wall-clock times to absolute UTC instants using the **location's** timezone (`fromZonedTime`), and overnight shifts roll to the next calendar day. Availability checks convert the shift to the location's canonical timezone before comparing against the staff member's window. Ana, certified Downtown (ET) and Marina (PT) with 9am to 5pm availability in each location's local time, demonstrates this in the seed data.

**4. Simultaneous Assignment**
Both managers submit at the same moment. `/api/assignments/confirm` takes `pg_advisory_xact_lock(hashtext(userId))` inside a transaction: the first request commits its assignment; the second blocks on the lock, then re-runs the engine against committed state, sees the first assignment, and returns the double-booking block with suggestions. One succeeds, one gets a clear error in real time via SSE. Application-level checks alone would race; the lock is what makes the decision atomic.

**5. The Fairness Complaint**
Navigate to Analytics > Fairness Report. The report shows total hours, premium shift count (Friday/Saturday evenings), and a fairness score per staff member. A low score indicates under-representation; use the data to respond to the complaint.

**6. The Regret Swap**
Staff A submitted the swap request. Before manager approval, Staff A can cancel it from the Swaps page (`/api/swaps/cancel`): the status changes to `cancelled` and the target colleague is notified. The original assignment remains unchanged. Drop requests expire automatically 24 hours before the shift starts.
