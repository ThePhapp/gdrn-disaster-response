package com.gdrn.dashboard.infrastructure;

import com.gdrn.dashboard.application.port.DashboardStatistics;
import com.gdrn.reporting.application.contract.ReportStatisticsQuery;
import com.gdrn.rescue.application.contract.RescueStatisticsQuery;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class ModuleDashboardStatistics implements DashboardStatistics {
    private final ReportStatisticsQuery reports;
    private final RescueStatisticsQuery rescue;
    private final TransactionTemplate reads;
    private final Clock clock = Clock.systemUTC();

    public ModuleDashboardStatistics(ReportStatisticsQuery reports, RescueStatisticsQuery rescue,
                                     PlatformTransactionManager transactions) {
        this.reports = reports;
        this.rescue = rescue;
        reads = new TransactionTemplate(transactions);
        reads.setReadOnly(true);
        reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    @Override public Snapshot read(Instant fromInclusive, Instant toExclusive) {
        return reads.execute(ignored -> {
            var reportCounts = reports.summarize(fromInclusive, toExclusive);
            Instant asOf = clock.instant();
            var rescueCounts = rescue.summarize(fromInclusive, toExclusive);
            return new Snapshot(asOf,
                    new Reports(reportCounts.pending(), reportCounts.verified(), reportCounts.rejected()),
                    new Missions(rescueCounts.assigned(), rescueCounts.inProgress(), rescueCounts.completed()),
                    new Teams(rescueCounts.availableTeams(), rescueCounts.busyTeams()));
        });
    }
}
