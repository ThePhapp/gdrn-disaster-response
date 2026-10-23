package com.gdrn.reporting.application.port;

import com.gdrn.reporting.domain.ReportAttachment;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportAttachmentStore {
    /** Inserts only while the report is pending and below the configured limit. */
    Optional<ReportAttachment> insertIfCapacity(ReportAttachment attachment, int maxAttachments);
    List<ReportAttachment> findByReportId(UUID reportId);
    Optional<ReportAttachment> findById(UUID reportId, UUID attachmentId);
    /** Hides the row before physical deletion and returns its storage key. */
    Optional<String> markDeleted(UUID reportId, UUID attachmentId, Instant deletedAt);
}
