# Interview Prep — Coastal Eats Shift Manager (Local Only, Not Pushed)

## Project in One Sentence
A multi-location restaurant scheduling platform (4 locations, 2 time zones) with a real-time constraint engine, SSE updates, and an AI chat assistant — built to pass the 6 evaluation scenarios.

---

## 5 Questions You'll Be Asked (and the exact answers to give)

### 1. "Walk me through the constraint engine — how does it prevent double-booking when two managers assign the same person at the same moment?"

**Answer:**
> The check endpoint (`/api/assignments/check`) runs all 8 rules in parallel against committed state. But application-level checks race. The confirm endpoint (`/api/assignments/confirm`) serializes the decision:
> 
> ```sql
> BEGIN;
>   SELECT pg_advisory_xact_lock(hashtext(userId));  -- one writer per staff member
>   -- re-run the FULL engine inside the lock against fresh committed state
>   INSERT INTO shift_assignments ...;
> COMMIT;
> ```
> 
> The second request blocks on the advisory lock until the first commits, then its engine run sees the new assignment and returns a double-booking block. One succeeds, one gets a clear error — no race.

### 2. "How does the timezone logic work? The spec mentions cross-timezone staff like Ana."

**Answer:**
> All timestamps are `TIMESTAMPTZ` (absolute UTC instants). Every shift is stored with its location's canonical timezone. When a manager creates a shift, the wall-clock time is resolved to UTC using `fromZonedTime(date + time, locationTimezone)`. Overnight shifts roll to the next calendar day. Availability windows are evaluated in the **location's** timezone — Ana's 9am–5pm at Downtown is ET, and her 9am–5pm at Marina is PT. The engine converts the shift start to the location's zone before comparing. Demo seed has Ana certified at both with windows in each zone.

### 3. "The spec says weekly hours is a warning at 40h, not a block. How did you implement that?"

**Answer:**
> In `checkers.ts` the weekly hours checker returns `severity: 'warn'` at 35h+ and again at 40h+, never `'block'`. The confirm endpoint treats `'warn'` as pass-with-flag: the manager sees the projected total (e.g. "42.5h — overtime cost impact: confirm only if intentional") and decides. Only `'block'` severity (double-booking, missing skill, etc.) prevents assignment. The 7th consecutive day returns `'override'` severity — it requires a documented reason but doesn't hard-block.

### 4. "How does Smart Assist work? Does it call OpenAI?"

**Answer:**
> Smart Assist uses **NVIDIA NIM** (`integrate.api.nvidia.com`, model `deepseek-ai/deepseek-v4-flash-0731`) via the Vercel AI SDK's OpenAI-compatible client. We did **not** use the OpenAI API (token constraints). The model has two tools that query the real database:
> - `getAvailableStaff(location, skill, date, start?, end?)` → calls the deterministic `getCoverageSuggestions` engine, returns qualified staff with hours-this-week
> - `checkOvertimeRisks(location?)` → real projected hours from confirmed+assigned shifts
> 
> **Key**: Coverage suggestions are a DB query, not an LLM hallucination. Without an `NVIDIA_API_KEY`, Smart Assist degrades gracefully: it explains offline mode and points to the constraint checks on the Schedule page and the Overtime Risk panel. The rest of the app works fully without a key.

### 5. "What's the seed data? How does it demonstrate the evaluation scenarios?"

**Answer:**
> 12 users: admin, 2 managers (East owns Downtown+Westside ET, West owns Marina+Valley PT), 9 staff.
> 
> **Ana Torres** — the cross-timezone bartender, certified **Downtown (ET) AND Marina (PT)**, with 9am–5pm recurring windows in each location's local time. Demonstrates Scenario 3 (timezone tangle).
> 
> **Mike Turner** — double-booked Friday evening: Downtown bartender 17:00–01:00 AND Westside host 18:00–00:00 (both published, assigned). The grid shows the conflict; the engine reports it. Demonstrates Scenario 3 (pre-existing conflict) and Scenario 4 (simultaneous assignment on overlapping shifts).
> 
> All 9 staff have recurring availability windows; Ana has a Monday time-off override. The Fairness Report has non-trivial data. Seed is idempotent (safe to re-run).

---

## 3 Technical Deep-Dives to Have Ready

### A. Real-Time Architecture
> Manager action → Drizzle ORM write → PostgreSQL → PG trigger `notify('db_changes')` → `/api/events` SSE stream (Node runtime, heartbeat every 25s) → `EventSource` in browser → `useSSE` hook → affected components refetch. Works across tabs.

### B. Concurrency Guard Detail
> `pg_advisory_xact_lock` is transaction-scoped (auto-releases on commit/rollback). It locks on `hashtext(userId)` so concurrent assigns for different staff run in parallel; same staff serializes. Inside the lock we re-run the engine (not the pre-check) so we read the first transaction's committed write.

### C. Swap/Drop Flow
> Drop → lands on pick-up board for qualified staff → claim runs full constraint engine → if passes, original assignment = `dropped`, new = `confirmed`, swap request = `approved`, both parties notified. 3-pending-request limit enforced. 24h-before-shift expiry on drops.

---

## 2 "Gotcha" Questions & Quick Rebuttals

| Question | Rebuttal |
|---|---|
| "Why not use row-level locks or `SELECT FOR UPDATE`?" | Advisory locks serialize per-staff without locking shift rows; shifts can still be edited. `SELECT FOR UPDATE` would deadlock on concurrent shift creation. Advisory is the standard pattern for "one writer per entity" in Postgres. |
| "What if the NVIDIA model is slow (50s)?" | The AI SDK streams the response; UI shows "Calling database..." while tools run. Vercel Hobby `maxDuration=60` covers one tool call + model leg. In production we'd provision a dedicated endpoint or use a smaller model. The deterministic engine paths are instant regardless. |

---

## Live Demo Checklist (before the call)

- [ ] Vercel deployment URL in README (after `vercel deploy`)
- [ ] Persona picker at `/` — one click to Admin / East Manager / Staff
- [ ] Seed data visible: Ana in both time zones, Mike double-booked Friday
- [ ] Create shift → assigns to Ana at Marina 10–16 PT (within her window) → passes
- [ ] Smart Assist: "Who can cover bartender at Downtown tonight?" → real suggestions with hours
- [ ] Analytics: Overtime Risk shows Mike at 14h (2 shifts), Fairness shows premium distribution
- [ ] Swaps page: drop a shift, claim it from another persona, see live update
- [ ] Availability page: tick days, save recurring, add override — managers notified

---

## Repo & Deployment

- **GitHub**: https://github.com/llakterian/ShiftSync
- **Branch**: `main` (latest: `be53e18`)
- **Vercel**: auto-deploys on push; env vars `DATABASE_URL`, `NVIDIA_API_KEY`
- **Supabase**: Transaction pooler (port 6543) for writes; Session pooler (5432) for SSE listener

---

## If They Ask "What Would You Do With More Time?"

1. **Authentication** — replace cookie persona with NextAuth (GitHub/Google + email magic links)
2. **Clock-in/out** — QR code per shift, geofence validation, real-time On-Duty board
3. **Mobile PWA** — staff can claim drops, set availability offline-first
4. **Payroll export** — hours × role × location, overtime breakdown, CSV
5. **Conflict resolution UI** — side-by-side view for simultaneous assignment with reason field

---

*End of prep doc. Not in git. Good luck.*