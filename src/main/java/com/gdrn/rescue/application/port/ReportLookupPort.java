package com.gdrn.rescue.application.port;

import java.util.Optional;
import java.util.UUID;

public interface ReportLookupPort {
    Optional<ReportSummary> findById(UUID reportId);
}
