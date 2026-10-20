package com.gdrn.dashboard.application;

import com.gdrn.dashboard.application.port.DashboardStatistics;
import java.time.LocalDate;
import java.time.ZoneId;

/** Read-only orchestration; calendar-day semantics are independent of HTTP and persistence. */
public class DashboardService {
    public static final ZoneId TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final DashboardStatistics statistics;

    public DashboardService(DashboardStatistics statistics) { this.statistics = statistics; }

    public DashboardSummary summarize(String role, LocalDate from, LocalDate to) {
        if (!"AUTHORITY".equals(role)) throw new SecurityException("Authority required");
        if ((from == null) != (to == null) || (from != null
                && (from.getYear() < 1 || to.getYear() > 9999 || from.isAfter(to)))) {
            throw new IllegalArgumentException("Invalid date range");
        }
        var snapshot = statistics.read(from == null ? null : from.atStartOfDay(TIME_ZONE).toInstant(),
                to == null ? null : to.plusDays(1).atStartOfDay(TIME_ZONE).toInstant());
        return new DashboardSummary(from, to, TIME_ZONE.getId(), snapshot.asOf(),
                snapshot.reports(), snapshot.missions(), snapshot.teams());
    }
}
