package com.gdrn.rescue.application.contract;

import java.time.Instant;

/** Current mission status by assignment window; team availability is always current/all time. */
public interface RescueStatisticsQuery {
    Counts summarize(Instant fromInclusive, Instant toExclusive);

    record Counts(long assigned, long inProgress, long completed, long availableTeams, long busyTeams) {}
}
