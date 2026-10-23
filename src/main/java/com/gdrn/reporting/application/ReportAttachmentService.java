package com.gdrn.reporting.application;

import com.gdrn.reporting.application.port.ReportAttachmentStorage;
import com.gdrn.reporting.application.port.ReportAttachmentStore;
import com.gdrn.reporting.application.port.ReportStore;
import com.gdrn.reporting.domain.Report;
import com.gdrn.reporting.domain.ReportAttachment;
import com.gdrn.reporting.domain.ReportStatus;
import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

public final class ReportAttachmentService {
    public static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    public static final int MAX_ATTACHMENTS_PER_REPORT = 5;

    private final ReportStore reports;
    private final ReportAttachmentStore attachments;
    private final ReportAttachmentStorage storage;
    private final Clock clock;

    public ReportAttachmentService(ReportStore reports, ReportAttachmentStore attachments,
                                   ReportAttachmentStorage storage, Clock clock) {
        this.reports = reports;
        this.attachments = attachments;
        this.storage = storage;
        this.clock = clock;
    }

    public ReportAttachment upload(ReportActor actor, UUID reportId, AttachmentUpload upload) {
        actor.requireCitizen();
        Report report = ownedReport(actor, reportId);
        requireEditable(report);

        UUID attachmentId = UUID.randomUUID();
        ReportAttachmentStorage.StoredFile stored = storage.store(attachmentId, upload);
        try {
            ReportAttachment attachment = ReportAttachment.create(attachmentId, reportId,
                    safeFilename(upload.originalFilename()), stored.mediaType(), stored.sizeBytes(), stored.storageKey(),
                    clock.instant().truncatedTo(ChronoUnit.MICROS));
            return attachments.insertIfCapacity(attachment, MAX_ATTACHMENTS_PER_REPORT)
                    .orElseThrow(() -> new AttachmentLimitReached());
        } catch (RuntimeException error) {
            deleteQuietly(stored.storageKey());
            throw error;
        }
    }

    public List<ReportAttachment> list(ReportActor actor, UUID reportId) {
        visibleReport(actor, reportId);
        return attachments.findByReportId(reportId);
    }

    public AttachmentDownload download(ReportActor actor, UUID reportId, UUID attachmentId) {
        visibleReport(actor, reportId);
        ReportAttachment attachment = attachments.findById(reportId, attachmentId).orElseThrow(ReportNotFound::new);
        InputStream content = storage.open(attachment.storageKey());
        return new AttachmentDownload(attachment, content);
    }

    public void delete(ReportActor actor, UUID reportId, UUID attachmentId) {
        actor.requireCitizen();
        Report report = ownedReport(actor, reportId);
        requireEditable(report);
        String storageKey = attachments.markDeleted(reportId, attachmentId, now()).orElseThrow(ReportNotFound::new);
        storage.delete(storageKey);
    }

    private Report visibleReport(ReportActor actor, UUID reportId) {
        Report report = reports.findById(reportId).orElseThrow(ReportNotFound::new);
        if (!actor.canRead(report.reporterId())) throw new ReportNotFound();
        return report;
    }

    private Report ownedReport(ReportActor actor, UUID reportId) {
        Report report = visibleReport(actor, reportId);
        if (!actor.id().equals(report.reporterId())) throw new ReportNotFound();
        return report;
    }

    private static void requireEditable(Report report) {
        if (report.status() != ReportStatus.PENDING || report.withdrawnAt() != null) {
            throw new AttachmentNotEditable();
        }
    }

    private Instant now() { return clock.instant().truncatedTo(ChronoUnit.MICROS); }

    private static String safeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "evidence-image";
        String base = filename.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "_").trim();
        if (base.isBlank()) return "evidence-image";
        return base.length() <= 255 ? base : base.substring(0, 255);
    }

    private void deleteQuietly(String storageKey) {
        try { storage.delete(storageKey); } catch (RuntimeException ignored) { }
    }
}
