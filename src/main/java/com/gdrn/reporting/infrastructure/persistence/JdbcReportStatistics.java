package com.gdrn.reporting.infrastructure.persistence;

import com.gdrn.reporting.application.contract.ReportStatisticsQuery;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class JdbcReportStatistics implements ReportStatisticsQuery {
    private final NamedParameterJdbcTemplate jdbc;

    public JdbcReportStatistics(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public Counts summarize(Instant fromInclusive, Instant toExclusive) {
        if ((fromInclusive == null) != (toExclusive == null)
                || (fromInclusive != null && !fromInclusive.isBefore(toExclusive))) {
            throw new IllegalArgumentException("Invalid statistics window");
        }
        var parameters = new MapSqlParameterSource();
        String window = "";
        if (fromInclusive != null) {
            window = " and created_at >= :from and created_at < :to";
            parameters.addValue("from", fromInclusive.atOffset(ZoneOffset.UTC))
                    .addValue("to", toExclusive.atOffset(ZoneOffset.UTC));
        }
        return jdbc.queryForObject("""
                select count(*) filter (where status = 'PENDING') as pending,
                       count(*) filter (where status = 'VERIFIED') as verified,
                       count(*) filter (where status = 'REJECTED') as rejected
                from reporting_reports where withdrawn_at is null
                """ + window, parameters, (rs, row) -> new Counts(
                rs.getLong("pending"), rs.getLong("verified"), rs.getLong("rejected")));
    }
}
