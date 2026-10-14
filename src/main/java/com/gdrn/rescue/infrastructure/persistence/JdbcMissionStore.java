package com.gdrn.rescue.infrastructure.persistence;

import com.gdrn.rescue.application.MissionPageResult;
import com.gdrn.rescue.application.ReportAlreadyAssigned;
import com.gdrn.rescue.application.TeamBusy;
import com.gdrn.rescue.application.port.MissionRepository;
import com.gdrn.rescue.domain.Mission;
import com.gdrn.rescue.domain.MissionStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public class JdbcMissionStore implements MissionRepository {
    private static final String SELECT = """
            SELECT id, report_id, team_id, status, assigned_at, started_at, completed_at, updated_at
            FROM rescue_missions
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate reads;

    public JdbcMissionStore(NamedParameterJdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.reads = new TransactionTemplate(transactions);
        this.reads.setReadOnly(true);
        this.reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    @Override
    public Mission insert(Mission mission) {
        var params = new MapSqlParameterSource()
                .addValue("id", mission.id())
                .addValue("reportId", mission.reportId())
                .addValue("teamId", mission.teamId())
                .addValue("status", mission.status().name())
                .addValue("assignedAt", OffsetDateTime.ofInstant(mission.assignedAt(), ZoneOffset.UTC))
                .addValue("startedAt", mission.startedAt() != null ? OffsetDateTime.ofInstant(mission.startedAt(), ZoneOffset.UTC) : null)
                .addValue("completedAt", mission.completedAt() != null ? OffsetDateTime.ofInstant(mission.completedAt(), ZoneOffset.UTC) : null)
                .addValue("updatedAt", OffsetDateTime.ofInstant(mission.updatedAt(), ZoneOffset.UTC));

        try {
            jdbc.update("""
                    INSERT INTO rescue_missions
                        (id, report_id, team_id, status, assigned_at, started_at, completed_at, updated_at)
                    VALUES
                        (:id, :reportId, :teamId, :status, :assignedAt, :startedAt, :completedAt, :updatedAt)
                    """, params);
            return mission;
        } catch (DataIntegrityViolationException ex) {
            String msg = ((ex.getMessage() != null ? ex.getMessage() : "") + " "
                    + (ex.getRootCause() != null && ex.getRootCause().getMessage() != null ? ex.getRootCause().getMessage() : ""))
                    .toLowerCase();

            boolean reportConflict = msg.contains("rescue_missions_report_id_key") || msg.contains("key (report_id)=");
            boolean teamConflict = msg.contains("idx_rescue_missions_team_active") || msg.contains("key (team_id)=");

            if (teamConflict) {
                throw new TeamBusy("Team already has an active mission");
            }
            if (reportConflict) {
                throw new ReportAlreadyAssigned("Report already has an assigned mission");
            }

            // Fallback checks
            if (hasActiveMissionForTeam(mission.teamId())) {
                throw new TeamBusy("Team already has an active mission");
            }
            if (existsByReportId(mission.reportId())) {
                throw new ReportAlreadyAssigned("Report already has an assigned mission");
            }
            throw ex;
        }
    }

    @Override
    public boolean updateMission(Mission mission, MissionStatus expectedCurrentStatus) {
        var params = new MapSqlParameterSource()
                .addValue("id", mission.id())
                .addValue("status", mission.status().name())
                .addValue("expectedStatus", expectedCurrentStatus.name())
                .addValue("startedAt", mission.startedAt() != null ? OffsetDateTime.ofInstant(mission.startedAt(), ZoneOffset.UTC) : null)
                .addValue("completedAt", mission.completedAt() != null ? OffsetDateTime.ofInstant(mission.completedAt(), ZoneOffset.UTC) : null)
                .addValue("updatedAt", OffsetDateTime.ofInstant(mission.updatedAt(), ZoneOffset.UTC));

        int rows = jdbc.update("""
                UPDATE rescue_missions
                SET status = :status, started_at = :startedAt, completed_at = :completedAt, updated_at = :updatedAt
                WHERE id = :id AND status = :expectedStatus
                """, params);

        return rows == 1;
    }

    @Override
    public Optional<Mission> findById(UUID id) {
        if (id == null) return Optional.empty();
        try {
            Mission mission = jdbc.queryForObject(
                    SELECT + " WHERE id = :id",
                    new MapSqlParameterSource("id", id),
                    JdbcMissionStore::mapRow);
            return Optional.ofNullable(mission);
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Mission> findByReportId(UUID reportId) {
        if (reportId == null) return Optional.empty();
        try {
            Mission mission = jdbc.queryForObject(
                    SELECT + " WHERE report_id = :reportId",
                    new MapSqlParameterSource("reportId", reportId),
                    JdbcMissionStore::mapRow);
            return Optional.ofNullable(mission);
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    @Override
    public boolean existsByReportId(UUID reportId) {
        if (reportId == null) return false;
        Boolean exists = jdbc.queryForObject(
                "SELECT count(*) > 0 FROM rescue_missions WHERE report_id = :reportId",
                new MapSqlParameterSource("reportId", reportId),
                Boolean.class);
        return Boolean.TRUE.equals(exists);
    }

    @Override
    public boolean hasActiveMissionForTeam(UUID teamId) {
        if (teamId == null) return false;
        Boolean exists = jdbc.queryForObject(
                "SELECT count(*) > 0 FROM rescue_missions WHERE team_id = :teamId AND status IN ('ASSIGNED', 'IN_PROGRESS')",
                new MapSqlParameterSource("teamId", teamId),
                Boolean.class);
        return Boolean.TRUE.equals(exists);
    }

    @Override
    public Set<UUID> findActiveTeamIds() {
        List<UUID> ids = jdbc.query(
                "SELECT DISTINCT team_id FROM rescue_missions WHERE status IN ('ASSIGNED', 'IN_PROGRESS')",
                (rs, rowNum) -> rs.getObject("team_id", UUID.class));
        return new HashSet<>(ids);
    }

    @Override
    public MissionPageResult findMissions(Optional<UUID> reportId, Optional<UUID> teamId,
                                         Optional<MissionStatus> status, int page, int size, String sort) {
        var params = new MapSqlParameterSource();
        var where = new StringBuilder(" WHERE 1=1");

        reportId.ifPresent(rId -> {
            where.append(" AND report_id = :reportId");
            params.addValue("reportId", rId);
        });

        teamId.ifPresent(tId -> {
            where.append(" AND team_id = :teamId");
            params.addValue("teamId", tId);
        });

        status.ifPresent(s -> {
            where.append(" AND status = :status");
            params.addValue("status", s.name());
        });

        String order = (sort != null && sort.contains("asc")) ? "ASC" : "DESC";

        params.addValue("limit", size);
        params.addValue("offset", (long) page * size);

        return reads.execute(ignored -> {
            Long count = jdbc.queryForObject("SELECT count(*) FROM rescue_missions" + where, params, Long.class);
            long total = count == null ? 0 : count;
            int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);

            List<Mission> items = jdbc.query(
                    SELECT + where + " ORDER BY assigned_at " + order + ", id ASC LIMIT :limit OFFSET :offset",
                    params,
                    JdbcMissionStore::mapRow);

            return new MissionPageResult(items, page, size, total, totalPages);
        });
    }

    private static Mission mapRow(ResultSet rs, int rowNum) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        UUID reportId = rs.getObject("report_id", UUID.class);
        UUID teamId = rs.getObject("team_id", UUID.class);
        MissionStatus status = MissionStatus.valueOf(rs.getString("status"));
        Instant assignedAt = rs.getObject("assigned_at", OffsetDateTime.class).toInstant();
        Instant startedAt = rs.getObject("started_at", OffsetDateTime.class) != null
                ? rs.getObject("started_at", OffsetDateTime.class).toInstant() : null;
        Instant completedAt = rs.getObject("completed_at", OffsetDateTime.class) != null
                ? rs.getObject("completed_at", OffsetDateTime.class).toInstant() : null;
        Instant updatedAt = rs.getObject("updated_at", OffsetDateTime.class).toInstant();

        return Mission.reconstitute(id, reportId, teamId, status, assignedAt, startedAt, completedAt, updatedAt);
    }
}
