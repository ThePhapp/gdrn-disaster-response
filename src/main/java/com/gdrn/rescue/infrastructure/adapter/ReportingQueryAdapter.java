package com.gdrn.rescue.infrastructure.adapter;

import com.gdrn.reporting.application.contract.LinkedDisasterState;
import com.gdrn.reporting.application.contract.ReportSnapshot;
import com.gdrn.reporting.application.contract.ReportState;
import com.gdrn.reporting.application.contract.ReportingQuery;
import com.gdrn.rescue.application.port.ReportLookupPort;
import com.gdrn.rescue.application.port.ReportSummary;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
public class ReportingQueryAdapter implements ReportLookupPort {
    private final ReportingQuery reportingQuery;

    public ReportingQueryAdapter(ReportingQuery reportingQuery) {
        this.reportingQuery = Objects.requireNonNull(reportingQuery, "reportingQuery");
    }

    @Override
    public Optional<ReportSummary> findById(UUID reportId) {
        if (reportId == null) return Optional.empty();
        return reportingQuery.findById(reportId).map(this::toSummary);
    }

    private ReportSummary toSummary(ReportSnapshot snapshot) {
        boolean verified = snapshot.status() == ReportState.VERIFIED;
        if (verified && snapshot.disaster().isEmpty()) {
            throw new IllegalStateException("Data integrity error: VERIFIED report missing disaster reference");
        }
        boolean disasterActive = snapshot.disaster()
                .map(d -> d.status() == LinkedDisasterState.ACTIVE)
                .orElse(false);
        return new ReportSummary(snapshot.id(), snapshot.reporterId(), verified, disasterActive);
    }
}
