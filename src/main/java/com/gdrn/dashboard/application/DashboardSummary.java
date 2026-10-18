package com.gdrn.dashboard.application;

import com.gdrn.dashboard.application.port.DashboardStatistics;
import java.time.Instant;
import java.time.LocalDate;

public record DashboardSummary(LocalDate from, LocalDate to, String timeZone, Instant asOf,
        DashboardStatistics.Reports reports, DashboardStatistics.Missions missions,
        DashboardStatistics.Teams teams) {}
