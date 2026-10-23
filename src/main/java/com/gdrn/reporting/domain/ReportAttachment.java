package com.gdrn.reporting.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Metadata for a private evidence image. The binary content belongs to a storage adapter. */
public record ReportAttachment(UUID id, UUID reportId, String originalFilename, String mediaType,
                               long sizeBytes, String storageKey, Instant createdAt) {
    public ReportAttachment {
        Objects.requireNonNull(id);
        Objects.requireNonNull(reportId);
        Objects.requireNonNull(originalFilename);
        Objects.requireNonNull(mediaType);
        Objects.requireNonNull(storageKey);
        Objects.requireNonNull(createdAt);
        if (originalFilename.isBlank() || originalFilename.length() > 255 || containsControl(originalFilename)) {
            throw new InvalidReportAttachment("filename");
        }
        if (!mediaType.equals("image/jpeg") && !mediaType.equals("image/png")) {
            throw new InvalidReportAttachment("mediaType");
        }
        if (sizeBytes < 1) throw new InvalidReportAttachment("size");
        if (storageKey.isBlank() || storageKey.contains("/") || storageKey.contains("\\") || storageKey.contains("..")) {
            throw new InvalidReportAttachment("storageKey");
        }
    }

    public static ReportAttachment create(UUID id, UUID reportId, String originalFilename, String mediaType,
                                          long sizeBytes, String storageKey, Instant createdAt) {
        return new ReportAttachment(id, reportId, originalFilename, mediaType, sizeBytes, storageKey, createdAt);
    }

    private static boolean containsControl(String value) {
        return value.chars().anyMatch(Character::isISOControl);
    }
}
