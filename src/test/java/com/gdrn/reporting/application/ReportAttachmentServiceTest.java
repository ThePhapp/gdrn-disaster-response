package com.gdrn.reporting.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.gdrn.reporting.application.port.ReportAttachmentStorage;
import com.gdrn.reporting.application.port.ReportAttachmentStore;
import com.gdrn.reporting.application.port.ReportStore;
import com.gdrn.reporting.domain.Coordinates;
import com.gdrn.reporting.domain.Report;
import com.gdrn.reporting.domain.ReportAttachment;
import com.gdrn.reporting.domain.ReportStatus;
import com.gdrn.reporting.domain.ReportType;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReportAttachmentServiceTest {
    private final ReportStore reports = mock(ReportStore.class);
    private final ReportAttachmentStore attachments = mock(ReportAttachmentStore.class);
    private final ReportAttachmentStorage storage = mock(ReportAttachmentStorage.class);
    private final UUID citizenId = UUID.randomUUID();
    private final UUID reportId = UUID.randomUUID();
    private final ReportActor citizen = new ReportActor(citizenId, ReportActor.Role.CITIZEN);
    private final ReportActor authority = new ReportActor(UUID.randomUUID(), ReportActor.Role.AUTHORITY);
    private final Report report = Report.submit(reportId, citizenId, ReportType.FLOOD, "Water rising",
            new Coordinates(21, 105), Instant.parse("2026-10-23T00:00:00Z"));
    private final ReportAttachmentService service = new ReportAttachmentService(reports, attachments, storage,
            Clock.fixed(Instant.parse("2026-10-23T01:00:00.123456Z"), ZoneOffset.UTC));

    @BeforeEach
    void setup() {
        when(reports.findById(reportId)).thenReturn(Optional.of(report));
    }

    @Test
    void citizenCanUploadAndListOwnEvidenceButAuthorityCannotUpload() {
        var stored = new ReportAttachmentStorage.StoredFile(UUID.randomUUID() + ".png", "image/png", 128);
        when(storage.store(any(), any())).thenReturn(stored);
        when(attachments.insertIfCapacity(any(), eq(5))).thenAnswer(invocation -> Optional.of(invocation.getArgument(0)));

        var saved = service.upload(citizen, reportId,
                new AttachmentUpload("folder/photo.png", "image/png", 128, new ByteArrayInputStream(new byte[]{1})));

        assertThat(saved.originalFilename()).isEqualTo("photo.png");
        assertThat(saved.mediaType()).isEqualTo("image/png");
        verify(attachments).insertIfCapacity(saved, 5);
        assertThatThrownBy(() -> service.upload(authority, reportId,
                new AttachmentUpload("photo.png", "image/png", 1, new ByteArrayInputStream(new byte[]{1}))))
                .isInstanceOf(ReportAccessDenied.class);
    }

    @Test
    void anotherCitizenCannotDiscoverReportAttachments() {
        var other = new ReportActor(UUID.randomUUID(), ReportActor.Role.CITIZEN);
        assertThatThrownBy(() -> service.list(other, reportId)).isInstanceOf(ReportNotFound.class);
        verify(attachments, never()).findByReportId(any());
    }

    @Test
    void storageIsCleanedWhenAttachmentLimitIsReached() {
        var key = UUID.randomUUID() + ".jpg";
        when(storage.store(any(), any())).thenReturn(new ReportAttachmentStorage.StoredFile(key, "image/jpeg", 42));
        when(attachments.insertIfCapacity(any(), eq(5))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.upload(citizen, reportId,
                new AttachmentUpload("photo.jpg", "image/jpeg", 42, new ByteArrayInputStream(new byte[]{1}))))
                .isInstanceOf(AttachmentLimitReached.class);
        verify(storage).delete(key);
    }

    @Test
    void verifiedReportCannotBeChanged() {
        Report verified = Report.reconstitute(report.id(), report.reporterId(), report.type(), report.description(),
                report.coordinates(), report.createdAt(), report.updatedAt(), ReportStatus.VERIFIED,
                UUID.randomUUID(), report.updatedAt(), null, null, null, 1);
        when(reports.findById(reportId)).thenReturn(Optional.of(verified));

        assertThatThrownBy(() -> service.upload(citizen, reportId,
                new AttachmentUpload("photo.png", "image/png", 1, new ByteArrayInputStream(new byte[]{1}))))
                .isInstanceOf(AttachmentNotEditable.class);
        verifyNoInteractions(storage, attachments);
    }

    @Test
    void deleteHidesMetadataBeforePhysicalDeleteAndDownloadChecksAttachmentOwnership() {
        var attachment = ReportAttachment.create(UUID.randomUUID(), reportId, "photo.png", "image/png", 42,
                UUID.randomUUID() + ".png", report.createdAt());
        when(attachments.findById(reportId, attachment.id())).thenReturn(Optional.of(attachment));
        when(storage.open(attachment.storageKey())).thenReturn(new ByteArrayInputStream(new byte[]{1}));
        when(attachments.markDeleted(eq(reportId), eq(attachment.id()), any())).thenReturn(Optional.of(attachment.storageKey()));

        assertThat(service.download(authority, reportId, attachment.id()).attachment()).isEqualTo(attachment);
        service.delete(citizen, reportId, attachment.id());
        verify(storage).delete(attachment.storageKey());
    }
}
