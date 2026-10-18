# Reload session fix

Date: 2026-10-18  
Branch: `feat/ui-ux-list-compact`  
Commit: `838334a fix: restore auth session after page reload`

The frontend now persists the current JWT, user and expiry timestamp in the current
tab's `sessionStorage`. A full reload restores the session before React renders the
route guard, so users remain on their role landing page until the 900-second JWT TTL
ends. A new tab has its own storage and still requires login.

Invalid or expired stored data is removed during startup. Logout, a matching 401
response, and the expiry timer clear both memory and `sessionStorage`. The frontend
continues to use relative `/api` requests with an explicit Bearer header; no cookie or
`localStorage` authentication was added.

## Verification

- `npm.cmd run typecheck`: PASS.
- `npm.cmd test -- --run`: PASS, 16 files / 81 tests.
- `npm.cmd run build`: PASS; the existing MapLibre chunk-size warning remains.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/dev.ps1 up -WaitTimeout 180`: PASS; Compose health, SPA routes and JSON API fallback passed.
- `npm.cmd run test:login -- --grep "real login, reload, logout" --reporter=line`: PASS, 3/3 real demo accounts.
- `npm.cmd run test:login -- --reporter=line`: PASS, 19/19 browser tests.

The reload browser check confirms citizen and authority users return to their correct
landing route after reload, and logout leaves both `localStorage` and `sessionStorage`
empty.
