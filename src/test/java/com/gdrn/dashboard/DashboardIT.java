package com.gdrn.dashboard;

import com.fasterxml.jackson.databind.JsonNode;
import com.gdrn.reporting.application.contract.ReportStatisticsQuery;
import com.gdrn.rescue.application.contract.RescueStatisticsQuery;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@Testcontainers
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DashboardIT {
    @Container static final PostgreSQLContainer<?> DATABASE = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.5").asCompatibleSubstituteFor("postgres"));
    static final String SECRET;
    static {
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        SECRET = Base64.getEncoder().encodeToString(bytes);
    }

    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", DATABASE::getJdbcUrl);
        registry.add("spring.datasource.username", DATABASE::getUsername);
        registry.add("spring.datasource.password", DATABASE::getPassword);
        registry.add("JWT_SECRET_BASE64", () -> SECRET);
    }

    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtEncoder encoder;
    @MockitoSpyBean ReportStatisticsQuery reports;
    @Autowired RescueStatisticsQuery rescue;

    @BeforeEach void resetData() {
        reset(reports);
        jdbc.update("delete from rescue_missions");
        jdbc.update("delete from rescue_teams");
        jdbc.update("delete from reporting_reports");
    }

    @Test void emptyDatabaseReturnsZeroCountsAndNoStore() {
        var response = get("", "AUTHORITY");
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        JsonNode body = response.getBody();
        assertThat(body.path("from").isNull()).isTrue();
        assertThat(body.path("to").isNull()).isTrue();
        assertThat(body.path("timeZone").asText()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(Instant.parse(body.path("asOf").asText())).isBeforeOrEqualTo(Instant.now());
        assertCounts(body, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    @Test void aggregatesAllRowsAndIncludesVietnamDayBoundariesButNotWithdrawnReports() {
        seed();
        var all = get("", "AUTHORITY").getBody();
        assertCounts(all, 107, 1, 1, 1, 1, 1, 1, 2);
        var day = get("?from=2026-10-18&to=2026-10-18", "AUTHORITY").getBody();
        assertThat(day.path("from").asText()).isEqualTo("2026-10-18");
        assertCounts(day, 105, 1, 1, 0, 1, 1, 1, 2);
        // The old ASSIGNED mission still occupies a team even though it is outside this cohort.
        var empty = get("?from=2020-01-01&to=2020-01-01", "AUTHORITY").getBody();
        assertCounts(empty, 0, 0, 0, 0, 0, 0, 1, 2);
    }

    @Test void onlyAuthorityGetIsAllowedAndInputsAreStrict() {
        assertThat(get("", null).getStatusCode().value()).isEqualTo(401);
        for (String role : List.of("CITIZEN", "ADMIN", "RESPONDER")) {
            assertThat(get("", role).getStatusCode().value()).isEqualTo(403);
        }
        for (String query : List.of("?from=2026-10-18", "?to=2026-10-18", "?from=&to=",
                "?from=2026-02-30&to=2026-03-01", "?from=2026-10-19&to=2026-10-18",
                "?from=0000-01-01&to=2026-10-18", "?from=26-10-01&to=2026-10-18",
                "?from=2026-10-18&from=2026-10-18&to=2026-10-18", "?size=10")) {
            var response = get(query, "AUTHORITY");
            assertThat(response.getStatusCode().value()).as(query).isEqualTo(400);
            assertThat(response.getBody().path("code").asText()).isEqualTo("VALIDATION_ERROR");
        }
        var headers = headers("AUTHORITY");
        for (HttpMethod method : List.of(HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE)) {
            assertThat(http.exchange("/api/dashboard", method, new HttpEntity<>(null, headers), JsonNode.class)
                    .getStatusCode().value()).isEqualTo(403);
        }
        assertThat(http.exchange("/api/dashboard/unknown", HttpMethod.GET, new HttpEntity<>(null, headers), JsonNode.class)
                .getStatusCode().value()).isEqualTo(403);
        headers.setContentType(MediaType.APPLICATION_JSON);
        assertThat(http.exchange("/api/dashboard", HttpMethod.GET, new HttpEntity<>("{}", headers), JsonNode.class)
                .getStatusCode().value()).isEqualTo(400);
        headers.setBearerAuth("invalid");
        assertThat(http.exchange("/api/dashboard", HttpMethod.GET, new HttpEntity<>(null, headers), JsonNode.class)
                .getStatusCode().value()).isEqualTo(401);
    }

    @Test void countsShareOneSnapshotWhenAConcurrentMissionCompletesBetweenProviders() {
        seed();
        doAnswer(invocation -> {
            Object counts = invocation.callRealMethod();
            try (var worker = Executors.newSingleThreadExecutor()) {
                worker.submit(() -> jdbc.update("""
                        update rescue_missions set status = 'COMPLETED', started_at = assigned_at,
                        completed_at = assigned_at, updated_at = assigned_at where status = 'ASSIGNED'
                        """)).get(10, TimeUnit.SECONDS);
            }
            return counts;
        }).when(reports).summarize(isNull(), isNull());
        assertCounts(get("", "AUTHORITY").getBody(), 107, 1, 1, 1, 1, 1, 1, 2);
        reset(reports);
        assertCounts(get("", "AUTHORITY").getBody(), 107, 1, 1, 0, 1, 2, 2, 1);
    }

    @Test void providerContractsValidateWindowsAndErrorsNeverReturnFakeZeros() {
        var start = Instant.parse("2026-10-18T00:00:00Z");
        assertThatThrownBy(() -> reports.summarize(start, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rescue.summarize(null, start)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rescue.summarize(start, start)).isInstanceOf(IllegalArgumentException.class);
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("test outage"))
                .when(reports).summarize(isNull(), isNull());
        var response = get("", "AUTHORITY");
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().path("code").asText()).isEqualTo("INTERNAL_ERROR");
        assertThat(response.getBody().toString()).doesNotContain("test outage", "pending");
    }

    private void seed() {
        jdbc.update("""
                insert into reporting_reports(id, reporter_id, type, description, location, status, created_at, updated_at)
                select gen_random_uuid(), gen_random_uuid(), 'FLOOD', 'Statistics fixture',
                    ST_SetSRID(ST_MakePoint(105, 21), 4326)::geography, 'PENDING',
                    '2026-10-18T00:00:00Z'::timestamptz, '2026-10-18T00:00:00Z'::timestamptz
                from generate_series(1,105)
                """);
        // Exact lower bound, just before upper bound, and two excluded boundary rows.
        report("VERIFIED", "2026-10-17T17:00:00Z", false);
        report("REJECTED", "2026-10-18T16:59:59.999999Z", false);
        report("PENDING", "2026-10-17T16:59:59.999999Z", false);
        report("PENDING", "2026-10-18T17:00:00Z", false);
        report("PENDING", "2026-10-18T00:00:00Z", true);
        UUID first = team("One");
        UUID second = team("Two");
        team("Available");
        mission(first, "ASSIGNED", "2026-10-16T00:00:00Z");
        mission(second, "IN_PROGRESS", "2026-10-17T17:00:00Z");
        mission(first, "COMPLETED", "2026-10-18T16:59:59.999999Z");
    }

    private void report(String status, String time, boolean withdrawn) {
        var timestamp = java.time.OffsetDateTime.parse(time);
        jdbc.update("""
                insert into reporting_reports(id,reporter_id,type,description,location,status,created_at,updated_at,
                    disaster_id,verified_at,rejection_reason,rejected_at,withdrawn_at)
                values (?,?,'FLOOD','Fixture',ST_SetSRID(ST_MakePoint(105,21),4326)::geography,?,?,?, ?,?,?,?,?)
                """, UUID.randomUUID(), UUID.randomUUID(), status, timestamp, timestamp,
                status.equals("VERIFIED") ? UUID.randomUUID() : null,
                status.equals("VERIFIED") ? timestamp : null,
                status.equals("REJECTED") ? "Rejected fixture" : null,
                status.equals("REJECTED") ? timestamp : null, withdrawn ? timestamp : null);
    }

    private UUID team(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into rescue_teams(id,name) values (?,?)", id, name);
        return id;
    }

    private void mission(UUID team, String status, String time) {
        var timestamp = java.time.OffsetDateTime.parse(time);
        jdbc.update("""
                insert into rescue_missions(id,report_id,team_id,status,assigned_at,started_at,completed_at,updated_at)
                values (?,?,?,?,?,?,?,?)
                """, UUID.randomUUID(), UUID.randomUUID(), team, status, timestamp,
                status.equals("ASSIGNED") ? null : timestamp, status.equals("COMPLETED") ? timestamp : null, timestamp);
    }

    private ResponseEntity<JsonNode> get(String query, String role) {
        return http.exchange("/api/dashboard" + query, HttpMethod.GET, new HttpEntity<>(null, headers(role)), JsonNode.class);
    }

    private HttpHeaders headers(String role) {
        var headers = new HttpHeaders();
        if (role != null) {
            var now = Instant.now();
            var claims = JwtClaimsSet.builder().issuer("gdrn").audience(List.of("gdrn-spa"))
                    .subject(UUID.randomUUID().toString()).issuedAt(now).notBefore(now)
                    .expiresAt(now.plusSeconds(900)).claim("role", role).build();
            headers.setBearerAuth(encoder.encode(JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue());
        }
        return headers;
    }

    private void assertCounts(JsonNode body, long pending, long verified, long rejected,
            long assigned, long inProgress, long completed, long available, long busy) {
        assertThat(body.path("reports").isObject()).as(body.toString()).isTrue();
        assertThat(body.at("/reports/pending").asLong()).isEqualTo(pending);
        assertThat(body.at("/reports/verified").asLong()).isEqualTo(verified);
        assertThat(body.at("/reports/rejected").asLong()).isEqualTo(rejected);
        assertThat(body.at("/missions/assigned").asLong()).isEqualTo(assigned);
        assertThat(body.at("/missions/inProgress").asLong()).isEqualTo(inProgress);
        assertThat(body.at("/missions/completed").asLong()).isEqualTo(completed);
        assertThat(body.at("/teams/available").asLong()).isEqualTo(available);
        assertThat(body.at("/teams/busy").asLong()).isEqualTo(busy);
    }
}
