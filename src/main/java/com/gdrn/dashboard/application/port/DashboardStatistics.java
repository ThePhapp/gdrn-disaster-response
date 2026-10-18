package com.gdrn.dashboard.application.port;

import java.time.Instant;

public interface DashboardStatistics {
    Snapshot read(Instant fromInclusive, Instant toExclusive);

    record Reports(long pending, long verified, long rejected) {}
    record Missions(long assigned, long inProgress, long completed) {}
    record Teams(long available, long busy) {}
    record Snapshot(Instant asOf, Reports reports, Missions missions, Teams teams) {}
}
