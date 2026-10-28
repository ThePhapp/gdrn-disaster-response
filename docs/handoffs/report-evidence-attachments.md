# Report evidence attachments — handoff

## Scope

Branch: `feat/report-evidence-attachments`, created from `main` on 23/10/2026.

The reporting module now supports private evidence images for reports:

- CITIZEN owner can upload and delete while the report is `PENDING`.
- The owner and `AUTHORITY` can list and download visible evidence.
- JPEG/PNG only, 5 MiB per image, five images per report.
- Metadata is in Flyway V7; binary content uses a filesystem storage port rooted
  at `REPORT_ATTACHMENT_STORAGE_ROOT`, outside the frontend static root.
- Content is streamed through an authenticated endpoint after application
  ownership checks. No public or signed bypass URL is returned.
- Delete hides the metadata before physical deletion, and upload failures clean
  up the staged file when persistence cannot reserve a slot.

## Contract

- `E17 POST /api/reports/{id}/attachments` — owner CITIZEN, pending report.
- `E18 GET /api/reports/{id}/attachments` — owner or AUTHORITY.
- `E19 GET /api/reports/{id}/attachments/{attachmentId}/content` — owner or AUTHORITY.
- `E20 DELETE /api/reports/{id}/attachments/{attachmentId}` — owner CITIZEN, pending report.

See [reporting OpenAPI](../../src/main/resources/openapi/reporting.json),
[ADR 010](../adr/010-report-evidence-private-storage.md), and
[migration ledger](../architecture/phase1-module-contracts.md).

## Validation

- `mvn test`: PASS, 73 unit/domain/architecture tests.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 20 files / 93 tests.
- `npm run build`: PASS.
- `mvn clean verify`: unit phase PASS; integration phase NOT RUN because
  Testcontainers could not find a valid Docker daemon (`dockerDesktopLinuxEngine`
  returned an internal server error). No integration result is claimed.

## Create report evidence — 28/10/2026

- `/reports/new` now accepts optional JPEG/PNG evidence before submission, with
  multiple selection, local previews, removal and the existing five-image/5 MiB limits.
- Submission creates the report through E07, then uploads selected files through
  E17. Navigation waits for all uploads. After a partial failure, the saved report
  and remaining files stay in the form; retry sends only the remaining files.
  Report fields lock after creation, and the citizen can open the saved report.
- No backend contract, domain rule, schema or module boundary changed.
- Validation: focused reporting UI suite PASS (20 tests); frontend typecheck/build
  PASS; `mvnw.cmd clean verify` PASS (73 unit/architecture, 57 integration, no skips).
- Real Chromium + local backend: two PNGs, simulated failure on the second upload,
  retry, private image reads PASS. Observed one create request and three upload
  attempts. Test images were deleted and the test report withdrawn afterward.
- Visual inspection and the UI skill probe ran at 375/1280px, including keyboard
  and hover checks. Selected previews fit without horizontal page overflow.
  Probe P1–P3 flag the existing mobile header wrapping; all navigation remains
  visible. P4 flags the existing language switcher hover treatment. These concern
  the shared header and do not require changes for this upload control. Other
  probe notices concern existing card borders, coordinate columns and focus styles.
  Missing local map configuration used the existing manual-coordinate fallback.
