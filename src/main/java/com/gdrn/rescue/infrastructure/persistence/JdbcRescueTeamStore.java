package com.gdrn.rescue.infrastructure.persistence;

import com.gdrn.rescue.application.RescueTeamPageResult;
import com.gdrn.rescue.application.RescueTeamSummary;
import com.gdrn.rescue.application.port.RescueTeamRepository;
import com.gdrn.rescue.domain.RescueTeam;
import com.gdrn.rescue.domain.TeamAvailability;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcRescueTeamStore implements RescueTeamRepository {
    private static final RowMapper<RescueTeam> ROW_MAPPER = (rs, rowNum) ->
            new RescueTeam(rs.getObject("id", UUID.class), rs.getString("name"));

    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate reads;

    public JdbcRescueTeamStore(NamedParameterJdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.reads = new TransactionTemplate(transactions);
        reads.setReadOnly(true);
        reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    @Override
    public RescueTeam save(RescueTeam team) {
        jdbc.update("""
                INSERT INTO rescue_teams (id, name)
                VALUES (:id, :name)
                ON CONFLICT (id) DO UPDATE SET name = :name
                """, new MapSqlParameterSource()
                .addValue("id", team.id())
                .addValue("name", team.name()));
        return team;
    }

    @Override
    public Optional<RescueTeam> findById(UUID id) {
        if (id == null) return Optional.empty();
        try {
            RescueTeam team = jdbc.queryForObject(
                    "SELECT id, name FROM rescue_teams WHERE id = :id",
                    new MapSqlParameterSource("id", id),
                    ROW_MAPPER);
            return Optional.ofNullable(team);
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<RescueTeam> findByName(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        try {
            RescueTeam team = jdbc.queryForObject(
                    "SELECT id, name FROM rescue_teams WHERE name = :name",
                    new MapSqlParameterSource("name", name),
                    ROW_MAPPER);
            return Optional.ofNullable(team);
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    @Override
    public List<RescueTeam> findAll() {
        return jdbc.query("SELECT id, name FROM rescue_teams ORDER BY name ASC", ROW_MAPPER);
    }

    @Override
    public RescueTeamPageResult findTeams(int page, int size, String sort, String availability) {
        var params = new MapSqlParameterSource();
        var where = new StringBuilder(" WHERE 1=1");

        if (availability != null && !availability.isBlank()) {
            if ("BUSY".equalsIgnoreCase(availability)) {
                where.append("""
                     AND EXISTS (
                        SELECT 1 FROM rescue_missions m
                        WHERE m.team_id = t.id AND m.status IN ('ASSIGNED', 'IN_PROGRESS')
                    )""");
            } else if ("AVAILABLE".equalsIgnoreCase(availability)) {
                where.append("""
                     AND NOT EXISTS (
                        SELECT 1 FROM rescue_missions m
                        WHERE m.team_id = t.id AND m.status IN ('ASSIGNED', 'IN_PROGRESS')
                    )""");
            }
        }

        String order = (sort != null && sort.contains("desc")) ? "DESC" : "ASC";
        params.addValue("limit", size);
        params.addValue("offset", (long) page * size);

        return reads.execute(ignored -> {
            Long count = jdbc.queryForObject("SELECT count(*) FROM rescue_teams t" + where, params, Long.class);
            long total = count == null ? 0 : count;
            int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);

            String selectSql = """
                    SELECT t.id, t.name,
                           CASE WHEN EXISTS (
                               SELECT 1 FROM rescue_missions m
                               WHERE m.team_id = t.id AND m.status IN ('ASSIGNED', 'IN_PROGRESS')
                           ) THEN 'BUSY' ELSE 'AVAILABLE' END AS availability
                    FROM rescue_teams t
                    """ + where + " ORDER BY btrim(t.name) COLLATE \"C\" " + order + ", t.id ASC LIMIT :limit OFFSET :offset";

            List<RescueTeamSummary> items = jdbc.query(selectSql, params, (rs, rowNum) -> new RescueTeamSummary(
                    rs.getObject("id", UUID.class),
                    rs.getString("name"),
                    TeamAvailability.valueOf(rs.getString("availability"))
            ));

            return new RescueTeamPageResult(items, page, size, total, totalPages);
        });
    }
}
