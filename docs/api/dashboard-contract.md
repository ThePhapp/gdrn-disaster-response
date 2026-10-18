# DS1 — Dashboard statistics contract

Scope authorized by user on 18/10/2026; see DS1 in the single task catalog.
Extension to the E01–E15/S01–S06 baseline: E16, screen S07.

## HTTP

`GET /api/dashboard?from=2026-10-01&to=2026-10-18`, AUTHORITY only. No body.
Both dates must be supplied together or both omitted (all time). Strict YYYY-MM-DD,
years 0001–9999, from <= to. Dates include both calendar days in
`Asia/Ho_Chi_Minh`; SQL uses start inclusive / next-day start exclusive.
Unknown/repeated/empty query parameters or body => 400 VALIDATION_ERROR.
No/invalid/expired bearer => 401; citizen/unsupported role => 403. Other methods
and unknown dashboard subpaths remain denied. All responses use no-store and the
existing error shape. Storage failures => 500 INTERNAL_ERROR, never zero counts.

```json
{
  "from": "2026-10-01",
  "to": "2026-10-18",
  "timeZone": "Asia/Ho_Chi_Minh",
  "asOf": "2026-10-18T09:00:00Z",
  "reports": { "pending": 12, "verified": 9, "rejected": 3 },
  "missions": { "assigned": 2, "inProgress": 3, "completed": 4 },
  "teams": { "available": 5, "busy": 5 }
}
```

Without dates, `from`/`to` are null. Counts are nonnegative Java longs/JSON numbers.
Reports: current status, filtered by creation time, withdrawn excluded. Missions:
current status, filtered by assignment time. Active missions = assigned + inProgress.
This is a current-state view of a cohort, not a historical status snapshot or a count
of transitions within the interval. Team counts always cover all current teams;
busy iff any ASSIGNED/IN_PROGRESS mission exists, even outside the date range.
Empty cohorts return zeros, while teams still reflect current capacity.

## Published module contracts

Provider `reporting.application.contract.ReportStatisticsQuery`:
`Counts summarize(Instant fromInclusive, Instant toExclusive)`, record Counts
(pending, verified, rejected). Rescue publishes `RescueStatisticsQuery` with the
same window arguments and Counts(assigned, inProgress, completed, availableTeams,
busyTeams). Window is either two nulls (unbounded) or two ordered nonnull instants;
invalid windows throw IllegalArgumentException. Counts exclude pagination and
contain no IDs, report text, user data or persistence types.

Dashboard application depends only on its own `DashboardStatistics` port. Its
infrastructure maps provider contracts, under one read-only REPEATABLE READ
transaction on the existing datasource. All SQL remains in the owning provider;
no cross-module SQL or provider internal class imports. The response uses one
database snapshot; asOf is the read timestamp taken after the first provider query
establishes that snapshot, not a promise of live updates or historical reconstruction.
No write/domain aggregate/schema/migration is required for this read use case.

## UI

AUTHORITY navigation adds Dashboard; existing landing routes remain unchanged.
S07 has report total, active missions, available teams, two date inputs, Apply,
Clear, Refresh, report and mission breakdowns. Dates are drafts until Apply; Clear
returns to all time. Applied range/timezone and team-current-state caveat stay
visible. Loading/error/zero data, retry, 403 and late responses are handled without
showing old statistics under a new range. Logout unmounts and aborts the request.
English/Vietnamese, keyboard labels, 360/768/1280px; no chart library needed.
