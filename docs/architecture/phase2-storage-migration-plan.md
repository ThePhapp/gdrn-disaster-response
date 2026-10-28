# GDRN Phase 2 Distributed Object Storage Migration Plan

## 1. Context and Objective

In Phase 1, file attachments (incident evidence images, verification documents) are managed through local storage abstraction. For Phase 2 horizontal scaling across multiple container instances, GDRN requires an S3-compatible object storage topology (e.g., MinIO for on-premise/air-gapped deployment, AWS S3 / Cloudflare R2 for cloud deployments).

This RFC specifies the storage migration plan, pre-signed URL workflow, and Hexagonal port preservation without introducing breaking changes to Phase 1 domain logic.

---

## 2. Hexagonal Port and Adapter Preservation

The domain boundary remains completely untouched:

```text
+-------------------------------------------------------------------+
| com.gdrn.incident.application.port.out.AttachmentStoragePort      |
|   + store(AttachmentId id, byte[] data, String contentType)       |
|   + generatePresignedUploadUrl(AttachmentMetadata metadata)       |
|   + generatePresignedDownloadUrl(AttachmentId id, Duration ttl)   |
|   + delete(AttachmentId id)                                       |
+-------------------------------------------------------------------+
                                ^
                                |
      +-------------------------+-------------------------+
      |                                                   |
+------------------------------------+  +------------------------------------+
| Phase 1 Adapter:                   |  | Phase 2 Adapter:                   |
| LocalFileSystemStorageAdapter      |  | S3CompatibleStorageAdapter         |
| (Writes to local docker volume)    |  | (AWS SDK v2 / MinIO Client)        |
+------------------------------------+  +------------------------------------+
```

---

## 3. Direct-to-Storage Ingestion Pattern (Pre-signed URLs)

To eliminate backend memory saturation and high bandwidth overhead during multi-megabyte photo uploads in disaster areas:

1. **Upload Request**: Frontend requests an upload authorization token and pre-signed PUT URL via `POST /api/v1/incidents/{id}/attachments/presign`.
2. **Direct Upload**: Client PUTs raw binary directly to S3/MinIO bucket.
3. **Confirmation**: Frontend notifies backend upon upload completion via `POST /api/v1/incidents/{id}/attachments/confirm` with ETag and file size.
4. **Metadata Persistence**: GDRN backend verifies file existence via HeadObject API call and commits record in PostGIS DB within a single transaction.

---

## 4. Migration Execution Phases

1. **Phase 2.1 - Adapter Implementation**: Introduce `S3CompatibleStorageAdapter` guarded by `@ConditionalOnProperty(name = "gdrn.storage.provider", havingValue = "s3")`.
2. **Phase 2.2 - Dual-Read Strategy**:
   - Write new files exclusively to S3/MinIO.
   - For reads, inspect metadata: if S3 key present, serve pre-signed S3 URL; otherwise fallback to local volume path.
3. **Phase 2.3 - Background Sync**:
   - Run idempotent CLI migration tool to transfer legacy volume files to object storage bucket.
   - Update database attachment records with new object storage keys.
4. **Phase 2.4 - Deprecate Local Storage Adapter**: Remove local adapter once 100% of attachments are reconciled.

---

## 5. Security & Access Control

- All buckets remain **strictly private** (`private` ACL).
- Public access blocks enabled at bucket level.
- Temporary download URLs expire after 15 minutes (`TTL = 900s`).
- Virus/malware scanning hook integrated via asynchronous S3 event notification queue.
