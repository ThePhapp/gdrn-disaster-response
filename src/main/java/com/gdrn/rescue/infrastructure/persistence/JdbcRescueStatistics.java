package com.gdrn.rescue.infrastructure.persistence;

import com.gdrn.rescue.application.contract.RescueStatisticsQuery;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class JdbcRescueStatistics implements RescueStatisticsQuery {
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcRescueStatistics(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public Counts summarize(Instant fromInclusive, Instant toExclusive) {
        if ((fromInclusive == null) != (toExclusive == null)
                || (fromInclusive != null && !fromInclusive.isBefore(toExclusive))) {
            throw new IllegalArgumentException("Invalid statistics window");
        }
        var parameters = new MapSqlParameterSource();
        String window = "";
        if (fromInclusive != null) {
            window = " where assigned_at >= :from and assigned_at < :to";
            parameters.addValue("from", fromInclusive.atOffset(ZoneOffset.UTC))
                    .addValue("to", toExclusive.atOffset(ZoneOffset.UTC));
        }
        // One statement: team capacity never inherits the mission cohort's date filter.
        return jdbc.queryForObject("""
                with mission_counts as (
                    select count(*) filter (where status = 'ASSIGNED') as assigned,
                           count(*) filter (where status = 'IN_PROGRESS') as in_progress,
                           count(*) filter (where status = 'COMPLETED') as completed
                    from rescue_missions
                """ + window + """
                ), team_counts as (
                    select count(*) filter (where not exists (
                        select 1 from rescue_missions m where m.team_id = t.id
                        and m.status in ('ASSIGNED', 'IN_PROGRESS'))) as available,
                        count(*) filter (where exists (
                        select 1 from rescue_missions m where m.team_id = t.id
                        and m.status in ('ASSIGNED', 'IN_PROGRESS'))) as busy
                    from rescue_teams t
                )
                select * from mission_counts cross join team_counts
                """, parameters, (rs, row) -> new Counts(rs.getLong("assigned"),
                rs.getLong("in_progress"), rs.getLong("completed"),
                rs.getLong("available"), rs.getLong("busy")));
    }
}
