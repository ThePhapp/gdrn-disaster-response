package com.gdrn.reporting.application.contract;

import java.time.Instant;

/** Trusted aggregate query; excludes withdrawn reports. Null/null means all time. */
public interface ReportStatisticsQuery {
    Counts summarize(Instant fromInclusive, Instant toExclusive);

    record Counts(long pending, long verified, long rejected) {}
}
