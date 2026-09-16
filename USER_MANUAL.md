# Coastal Eats Shift Manager - User Manual

> This guide is for managers and staff at Coastal Eats restaurant group.
> For developer setup, refer to [README.md](README.md).

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Roles Explained](#2-roles-explained)
3. [Manager Guide](#3-manager-guide)
   - 3.1 [Schedule View](#31-schedule-view)
   - 3.2 [Creating a Shift](#32-creating-a-shift)
   - 3.3 [Assigning Staff to a Shift](#33-assigning-staff-to-a-shift)
   - 3.4 [Understanding Constraint Alerts](#34-understanding-constraint-alerts)
   - 3.5 [Publishing a Schedule](#35-publishing-a-schedule)
   - 3.6 [Approving Swap Requests](#36-approving-swap-requests)
   - 3.7 [Analytics Dashboard](#37-analytics-dashboard)
   - 3.8 [Smart Assist (AI Chat)](#38-smart-assist-ai-chat)
4. [Staff Guide](#4-staff-guide)
   - 4.1 [Viewing Your Schedule](#41-viewing-your-schedule)
   - 4.2 [Setting Your Availability](#42-setting-your-availability)
   - 4.3 [Requesting a Shift Swap](#43-requesting-a-shift-swap)
   - 4.4 [Dropping a Shift](#44-dropping-a-shift)
   - 4.5 [Picking Up an Available Shift](#45-picking-up-an-available-shift)
5. [Admin Guide](#5-admin-guide)
6. [Notifications](#6-notifications)
7. [Frequently Asked Questions](#7-frequently-asked-questions)

---

## 1. Getting Started

Open your browser and navigate to the Coastal Eats Shift Manager URL provided by your administrator.

You will land directly on the **Manager Schedule** page. The sidebar on the left shows the navigation menu based on your role.

**Test accounts (for the assessment demo):**

| Name | Email | Role |
|---|---|---|
| System Admin | admin@coastaleats.com | Admin |
| East Manager | east.manager@coastaleats.com | Manager |
| West Manager | west.manager@coastaleats.com | Manager |
| John Doe | john@coastaleats.com | Staff |
| Sarah Smith | sarah@coastaleats.com | Staff |
| Maria Garcia | maria@coastaleats.com | Staff |

---

## 2. Roles Explained

| Role | What they can do |
|---|---|
| **Admin** | Full visibility across all 4 locations. Can export audit logs, manage users and certifications. |
| **Manager** | Can create and publish shifts, assign staff, approve swaps, and view analytics for their assigned locations only. |
| **Staff** | Can view their schedule, set availability, request swaps, drop shifts, and pick up open shifts they qualify for. |

> A manager cannot see or edit data belonging to locations they are not assigned to.

---

## 3. Manager Guide

### 3.1 Schedule View

Navigate to **Schedule** in the left sidebar.

The **Weekly Grid** displays the current week with one column per day (Monday to Sunday). Each shift card within a column shows:
- Start and end time (in the location's local timezone)
- Required skill
- Assigned staff name(s)
- Headcount needed vs filled

Use the **Previous / Next** arrows to navigate between weeks.

---

### 3.2 Creating a Shift

1. Click the **Add Shift** button in the top-right corner of the Schedule page.
2. Fill in the form:
   - **Location** - Select one of your assigned locations (e.g. Downtown, Westside).
   - **Required Skill** - The role this shift needs (e.g. Bartender, Server, Line Cook, Host).
   - **Date** - The calendar date of the shift.
   - **Start Time / End Time** - Use 24-hour format or the time picker. Overnight shifts (e.g. 22:00 to 02:00) are supported.
   - **Headcount Needed** - How many staff members are needed for this shift.
3. Click **Create Shift**.

The shift appears on the weekly grid in **Draft** status. It is not yet visible to staff.

---

### 3.3 Assigning Staff to a Shift

1. Click on any shift card in the weekly grid.
2. The **Assign Staff** panel opens, showing a list of staff members.
3. Click a staff member's name to run the constraint check.
4. The system evaluates all 8 rules instantly:
   - Green checkmark: passed
   - Yellow warning: allowed but flagged (e.g. approaching 35h weekly)
   - Red block: cannot assign; reason shown clearly
5. If blocked, the system shows **Suggested Alternatives** - other qualified staff who pass all constraints.
6. If the check passes (or you accept a warning), click **Confirm Assignment**.

The assignment is saved immediately and reflected in the grid.

---

### 3.4 Understanding Constraint Alerts

| Alert Type | Icon | What it means | Action |
|---|---|---|---|
| **Block** | Red X | The assignment cannot be made as-is | Read the reason, use the suggested alternatives or change the shift time |
| **Warning** | Yellow triangle | The assignment is allowed but flagged | Review and confirm if intentional |
| **Pass** | Green tick | All rules satisfied | Confirm the assignment |

**Common block messages and what to do:**

- *"Staff member is already scheduled for an overlapping shift"* - The person is booked elsewhere at that time. Check the suggestions list.
- *"Requires at least 10 hours of rest between shifts"* - The shift starts too soon after their previous one. Adjust shift start time or pick someone else.
- *"Staff member does not have the required skill"* - The person lacks the required certification. Only staff certified for that role appear in suggestions.
- *"Staff member is not certified for this location"* - The person has not been approved to work at this location. Contact the admin to update certifications.
- *"Shift falls outside of recurring availability hours"* - The staff member marked themselves unavailable at that time. Check their availability or find a replacement.
- *"Weekly hours would exceed 40"* - Overtime block. The weekly hours checker shows exactly how many hours they are projected to work.
- *"Scheduling for a 7th consecutive day requires manager override"* - You must document a reason. This is a labour law compliance protection.

---

### 3.5 Publishing a Schedule

Once all shifts for the week are assigned:

1. Click the **Publish Week** button at the top of the Schedule page.
2. Confirm the action.
3. All shifts in draft status for the current week are published simultaneously.
4. Staff members receive an in-app notification that the schedule is live.

> Once published, shifts can only be edited up to **48 hours before the shift starts**. After that cutoff, changes require admin override.

---

### 3.6 Approving Swap Requests

When a staff member requests a swap or drop, you will receive an in-app notification.

1. Navigate to **Assignments** in the sidebar.
2. Open the **Pending Approvals** tab.
3. Review the swap details:
   - Who is requesting to swap with whom
   - Which shifts are involved
   - Whether both parties have agreed (for swaps)
4. Click **Approve** or **Reject**.
5. If approved, the assignments update immediately and both staff members are notified.

> If you edit a shift that has a pending swap request attached to it, the swap is automatically cancelled and all parties are notified.

---

### 3.7 Analytics Dashboard

Navigate to **Analytics** in the sidebar. Three panels are displayed:

**On-Duty Now** (top left)
- Updates in real time (no page refresh needed)
- Shows every staff member currently clocked into a shift
- Displays their location, role, and clock-in time

**Overtime Risk Assessment** (bottom left)
- Shows projected weekly hours for every staff member
- Colour-coded bars: green (safe), amber (warning, 35h+), red (critical, exceeds 40h)
- Lets you spot problems before the week is finished

**Schedule Fairness Report** (right)
- Tracks premium shifts (Friday and Saturday evenings)
- Shows total hours worked and premium shift count per person
- A fairness score below 75% indicates the staff member is under-represented in premium scheduling
- Use this to respond to fairness complaints with data

---

### 3.8 Smart Assist (AI Chat)

Navigate to **Smart Assist** in the sidebar.

The chat interface lets you ask natural language questions about your scheduling data. The system queries the database securely and responds with real information, not guesses.

**Example questions you can ask:**

- *"Who can cover a bartender shift at Downtown tonight at 8pm?"*
- *"Which staff members are approaching overtime this week?"*
- *"How many hours has Maria worked this month?"*
- *"Who is available for a server shift on Saturday evening?"*

> The Smart Assist only has access to scheduling data within your assigned locations. It cannot read data from locations you are not a manager of.

---

## 4. Staff Guide

### 4.1 Viewing Your Schedule

Navigate to **My Schedule** in the sidebar.

You will see cards for each of your upcoming confirmed shifts, showing:
- Date and day of the week
- Start and end times (in the location's local timezone)
- Location name
- Your role for that shift
- Status (Draft, Published, Confirmed)

Only **Published** shifts are visible to you. Draft shifts are only visible to managers.

---

### 4.2 Setting Your Availability

Navigate to **Availability** in the sidebar. There are two sections:

**Recurring Weekly Hours**

Set the hours you are generally available each day of the week. For example:
- Monday: 09:00 - 17:00
- Friday: 17:00 - 23:00
- Saturday: 17:00 - 23:00
- Sunday: Not available (leave blank or set as unavailable)

Click **Save Recurring** when done.

> Managers cannot schedule you outside your availability without seeing a constraint alert. Your availability protects you.

**Date Overrides**

For a specific date that differs from your normal pattern:
- Select the date
- Choose **Unavailable (Time Off)** to mark yourself as not available at all (e.g. holiday, personal appointment)
- Choose **Available (Custom Hours)** to set different hours for just that day

Click **Add Override**.

---

### 4.3 Requesting a Shift Swap

If you want to swap a shift with a specific colleague:

1. Go to **My Schedule** and find the shift.
2. Click **Request Swap** on the shift card.
3. Select the colleague you want to swap with.
4. Add an optional note (e.g. "Family event - can we swap Friday for your Tuesday?").
5. Click **Send Request**.

The workflow:
1. Your colleague receives a notification and must **Accept** or **Decline**.
2. If they accept, the request goes to your manager for final approval.
3. Once the manager approves, both schedules update and you both receive a confirmation.
4. Your original assignment stays in place until the manager approves.

> You cannot have more than **3 pending swap or drop requests** at one time.

---

### 4.4 Dropping a Shift

If you cannot work a shift and need someone else to pick it up:

1. Go to **My Schedule** and find the shift.
2. Click **Request Swap** and select the **Drop** option (no specific person needed).
3. Add a reason note.
4. Click **Submit Drop Request**.

The shift is listed in the **Available to Pick Up** board visible to all qualified staff. Your manager is notified.

> Drop requests that are unclaimed automatically expire **24 hours before the shift starts**. After that, you are still responsible for the shift unless the manager re-assigns it.

---

### 4.5 Picking Up an Available Shift

1. Navigate to **Shift Swaps** in the sidebar.
2. The top section shows all shifts that have been dropped and are available.
3. You only see shifts that you are **qualified** for (right location certification, right skill).
4. Click **Claim Shift** on any shift you want to pick up.
5. The constraint engine checks you against all 8 rules before confirming.
6. If approved, the shift appears on your schedule and the original staff member is released.

---

## 5. Admin Guide

As an admin you have access to everything across all 4 locations.

**Additional capabilities:**
- View the full audit trail: every assignment, swap, and edit is logged with timestamp and who made the change
- Export audit logs for any date range and location
- Manage staff certifications (certify or de-certify staff for locations)
- View the cross-location On-Duty live board

To access audit logs: navigate to **Admin > Audit Logs** and use the date range filter to export as CSV.

---

## 6. Notifications

The notification bell in the top header shows unread alerts. Notifications are delivered for:

| Event | Who gets notified |
|---|---|
| New shift assigned to you | Staff member |
| Schedule published for your location | All affected staff |
| Shift time or location changed | Assigned staff member |
| Swap request received | Target staff member |
| Swap request accepted by colleague | Requester |
| Swap approved or rejected by manager | Both staff members |
| Swap auto-cancelled (shift was edited) | Both staff members |
| Drop request needs claiming | All qualified staff at that location |
| Overtime warning triggered | Manager |
| Staff member's availability changed | Manager(s) for that location |

All notifications are stored and can be reviewed in the notification centre. You can mark individual notifications as read or clear all.

---

## 7. Frequently Asked Questions

**Q: I set my availability as 9am to 5pm but my manager scheduled me for a 6pm shift. How?**
A: The manager would have seen a constraint alert stating the shift falls outside your availability. If they confirmed anyway, contact your manager. The system flags it but managers can override warnings.

**Q: Can I be scheduled at two different locations in the same week?**
A: Yes, if you are certified at both locations. The system checks certifications on every assignment. It also checks that shifts at different locations do not overlap and that you have at least 10 hours of rest between them.

**Q: My swap request is pending but the manager edited the shift. What happened?**
A: The swap was automatically cancelled and you received a notification. This prevents confusion over which version of the shift was being swapped. You can submit a new swap request for the updated shift.

**Q: I cannot see a shift on my schedule that my manager says they assigned me to.**
A: Shifts are only visible to staff after the manager publishes the schedule. If the shift is still in Draft status, it will not appear on your My Schedule view yet.

**Q: The Smart Assist gave me a wrong answer. What should I do?**
A: The Smart Assist can only query data it has access to. If the data in the system is incorrect (e.g. wrong skill assigned to a staff member, wrong availability on file), update the underlying record first, then ask again. If you believe the answer is genuinely wrong, report it to your admin.

**Q: My drop request expired but I could not work the shift. What happens?**
A: You remain responsible for the shift unless your manager actively re-assigns it. Contact your manager as soon as possible so they can arrange coverage. The system will have sent them a notification when the drop request expired unclaimed.

**Q: Can a manager override the 7-day consecutive day block?**
A: Yes, but they must document a reason in the override field. This creates an audit log entry for labour law compliance purposes.
