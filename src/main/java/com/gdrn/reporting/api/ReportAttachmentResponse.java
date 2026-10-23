package com.gdrn.reporting.api;

import com.gdrn.reporting.domain.ReportAttachment;
import java.time.Instant;
import java.util.UUID;

public record ReportAttachmentResponse(UUID id, UUID reportId, String originalFilename,
                                       String mediaType, long sizeBytes, Instant createdAt) {
    static ReportAttachmentResponse from(ReportAttachment attachment) {
        return new ReportAttachmentResponse(attachment.id(), attachment.reportId(), attachment.originalFilename(),
                attachment.mediaType(), attachment.sizeBytes(), attachment.createdAt());
    }
}
