package com.gdrn.rescue.application.port;

import java.util.Objects;
import java.util.UUID;

public record ReportSummary(UUID id, UUID reporterId, boolean verified, boolean disasterActive) {
    public ReportSummary {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(reporterId, "reporterId");
    }
}
