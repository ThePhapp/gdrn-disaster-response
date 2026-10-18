# UI/UX list compact follow-up

Date: 2026-10-18  
Branch: `feat/ui-ux-list-compact`  
Base: `main` at `9b49b76`

## Scope

This follow-up addresses long list panels across the existing reporting and rescue
screens. It changes feature CSS only; routes, API contracts, data loading, and
business behavior are unchanged.

## Implemented

- S03 `/my-reports`: the desktop list card has a viewport-aware height and its own
  vertical scroll area. Report descriptions are limited to two lines and status
  badges wrap long Vietnamese labels safely.
- S04 `/operations/reports`: master list remains bounded and scrollable (`max-height: calc(100dvh - 14rem)`); the detail frame expands naturally to fit full content without an inner scrollbar. Facts use 3 columns, spacing is tightened, and read-only map is sized to 13.5rem so all report details, map, and actions display completely without scrolling down.
- S05 `/operations/disasters`: master list remains bounded and scrollable; the disaster detail panel expands naturally without an inner scrollbar with 3-column facts and a 13.5rem preview map so disaster details and action buttons display completely.
- S06 `/operations/rescue`: master list remains bounded; the mission detail panel expands naturally without an inner scrollbar with a 13.5rem preview map so all mission information displays completely.
- At tablet/mobile breakpoints the workbenches return to natural stacked flow and
  disable nested scrolling, preserving readable one-column layouts.

## Commit

- `4a2e74d style: compact feature lists and workbenches`

## Verification

The following checks passed on the local Docker stack without removing the database
volume:

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test -- --run` | PASS, 16 files / 81 tests |
| `npm.cmd run build` | PASS; existing MapLibre chunk-size warning remains |
| `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180` | PASS; database, backend, and frontend healthy; health, readiness, OpenAPI, Swagger, SPA deep routes, and JSON API fallback checked |
| `npm.cmd run test:login -- --reporter=line` with real Compose API | PASS, 19/19 browser tests |
| `./mvnw.cmd --no-transfer-progress clean verify` | PASS, 62 unit/architecture tests and 51 integration tests |

Browser artifacts for the visual review are generated under the ignored
`frontend/test-results/` directory. The reviewed screenshots include S03 at
1280px/360px and S06 at 1280px/360px.

## Handoff

The frontend image must be rebuilt after checking out this branch. With the local
`.env` already present, run:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180
```

The current local host ports are backend `8080` and frontend `5174`, subject to
the local `.env` configuration. No push or merge was performed.
