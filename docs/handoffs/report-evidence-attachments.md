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
