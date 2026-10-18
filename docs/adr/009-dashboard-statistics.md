# ADR 009 — Read-only dashboard through published aggregate contracts

Date: 18/10/2026. Status: implemented on DS1 branch, pending review/merge.

## Context

The user authorized an extension to the frozen 15-operation MVP: report status
counts, active missions, available rescue teams and a date filter. Existing list
APIs paginate and must not be used as a source for global totals. Reporting cannot
depend on Rescue, and a controller must not orchestrate cross-module persistence.

## Decision

Add a small `dashboard` module for the real read use case, without artificial domain
entities. Its plain Java application service validates role/date semantics and uses
a consumer-owned port. Infrastructure calls Reporting/Rescue aggregate contracts;
each provider's JDBC adapter owns SQL over its own tables. The Dashboard adapter
wraps these reads in one read-only REPEATABLE READ transaction on the existing
datasource. A concurrency integration test commits a mission completion between
provider queries and verifies the old snapshot followed by fresh counts next call.

Dates are inclusive `Asia/Ho_Chi_Minh` calendar dates, translated to a half-open
instant window. Report counts exclude withdrawn rows and filter by creation time;
mission counts filter by assignment time and reflect current status. Team capacity
always covers all teams, using all active missions, regardless of date range. This
avoids calling a team available merely because its assignment predates the cohort.

Expose E16 `GET /api/dashboard` to AUTHORITY only; other roles and HTTP methods
remain denied. Shared authenticated client/no-store, existing error DTO and role
guard are reused. No schema changes, migration, events, cache or new infrastructure.
The single task catalog records this explicit user-authorized scope exception.

## Consequences and alternatives

The dashboard is consistent within a request but becomes stale until refresh. It
does not reconstruct past status or capacity; a true historical dashboard requires
additional requirements and history data. Aggregate queries scan matching rows;
index/tuning decisions require measurement rather than an added speculative index.

Rejected: totals from one list page (incomplete), browser fetching every page
(expensive and inconsistent), SQL joins across modules (ownership violation),
placing orchestration in `shared` or Reporting (wrong responsibility/dependency),
and asynchronous materialized counters (unnecessary consistency/infrastructure cost).
