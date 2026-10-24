package com.gdrn.reporting.infrastructure.configuration;

import com.gdrn.reporting.application.ReportService;
import com.gdrn.reporting.application.ReportModerationService;
import com.gdrn.reporting.application.ReportAttachmentService;
import com.gdrn.reporting.application.PublishedReportingQuery;
import com.gdrn.reporting.application.contract.ReportingQuery;
import com.gdrn.reporting.application.port.DisasterLookup;
import com.gdrn.reporting.application.port.ReportStore;
import com.gdrn.reporting.application.port.ReportAttachmentStore;
import com.gdrn.reporting.application.port.ReportAttachmentStorage;
import com.gdrn.reporting.infrastructure.storage.FileSystemReportAttachmentStorage;
import java.nio.file.Path;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class ReportingConfiguration {
    @Bean ReportService reportService(ReportStore reports) {
        return new ReportService(reports, Clock.systemUTC());
    }
    @Bean ReportModerationService reportModerationService(ReportStore reports, DisasterLookup disasters) {
        return new ReportModerationService(reports, disasters, Clock.systemUTC());
    }
    @Bean ReportingQuery reportingQuery(ReportStore reports, DisasterLookup disasters) {
        return new PublishedReportingQuery(reports, disasters);
    }
    @Bean ReportAttachmentService reportAttachmentService(ReportStore reports, ReportAttachmentStore attachments,
                                                          ReportAttachmentStorage storage) {
        return new ReportAttachmentService(reports, attachments, storage, Clock.systemUTC());
    }
    @Bean ReportAttachmentStorage reportAttachmentStorage(
            @Value("${gdrn.reporting.attachments.root:${REPORT_ATTACHMENT_STORAGE_ROOT:.data/report-attachments}}") String root) {
        return new FileSystemReportAttachmentStorage(Path.of(root));
    }
}
