# ADR 010: Private report evidence attachments

## Status

Accepted for the reporting evidence slice.

## Context

Citizens need to attach image evidence to their reports, while citizens and
authorities must see only evidence allowed by the report ownership rules. A
public object URL would allow a caller to bypass the report authorization check.
The Phase 1 application is a modular monolith with PostgreSQL and local runtime
storage, so the feature needs a small explicit port rather than a new storage
service or messaging dependency.

## Decision

- Store attachment metadata in `reporting_report_attachments` and binary files
  under the configurable `REPORT_ATTACHMENT_STORAGE_ROOT` directory. The root
  is outside the frontend static web root and the database stores only a
  generated UUID-based storage key.
- Accept JPEG and PNG only. The application limit is five images per report and
  5 MiB per image. The storage adapter checks the declared MIME type and the
  actual image reader format before moving a temporary file to its final key.
- Use authenticated reporting endpoints for metadata and content. The
  application loads the report first, treats an inaccessible or missing report
  as `404`, and then loads the attachment by both report ID and attachment ID.
  Content responses are private, `no-store`, and streamed with the verified
  image media type; no public or signed bypass URL is returned.
- The report owner may upload and delete while the report is `PENDING`. An
  authority may list and download evidence for any visible report. Authorities
  and other citizens cannot mutate another citizen's evidence.
- Deletion marks metadata as hidden before deleting the physical file. A
  storage failure therefore cannot leave content accessible through the API;
  the hidden row and any orphan file can be handled by a later cleanup job.

## Consequences

The storage adapter is local-disk specific and must be backed up or replaced by
an adapter before a multi-instance deployment. The port keeps that change out
of the domain and application rules. Upload errors are mapped to stable API
codes for missing files, unsupported formats, size limits, report state,
capacity, and storage failures.
