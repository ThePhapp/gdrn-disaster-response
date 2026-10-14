package com.gdrn.rescue;

import com.fasterxml.jackson.databind.JsonNode;
import com.gdrn.disaster.application.DisasterService;
import com.gdrn.disaster.domain.Disaster;
import com.gdrn.disaster.domain.DisasterType;
import com.gdrn.disaster.domain.Severity;
import com.gdrn.reporting.application.ReportActor;
import com.gdrn.reporting.application.ReportModerationService;
import com.gdrn.reporting.application.ReportService;
import com.gdrn.reporting.domain.Coordinates;
import com.gdrn.reporting.domain.Report;
import com.gdrn.reporting.domain.ReportStatus;
import com.gdrn.reporting.domain.ReportType;
import com.gdrn.rescue.application.port.MissionRepository;
import com.gdrn.rescue.domain.MissionStatus;
import com.gdrn.rescue.infrastructure.configuration.DemoRescueTeamBootstrap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.reset;

@Testcontainers
@ActiveProfiles({"test", "demo"})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RescueIT {

    @Container
    static final PostgreSQLContainer<?> DATABASE = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.5").asCompatibleSubstituteFor("postgres"));

    static final UUID CITIZEN_ONE = UUID.randomUUID();
    static final UUID CITIZEN_TWO = UUID.randomUUID();
    static final UUID AUTHORITY_USER = UUID.randomUUID();
    static final String SECRET = randomKey();

    private static String randomKey() {
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", DATABASE::getJdbcUrl);
        registry.add("spring.datasource.username", DATABASE::getUsername);
        registry.add("spring.datasource.password", DATABASE::getPassword);
        registry.add("JWT_SECRET_BASE64", () -> SECRET);
        registry.add("DEMO_CITIZEN_ONE_EMAIL", () -> "one@example.test");
        registry.add("DEMO_CITIZEN_TWO_EMAIL", () -> "two@example.test");
        registry.add("DEMO_AUTHORITY_EMAIL", () -> "ops@example.test");
        registry.add("DEMO_CITIZEN_ONE_PASSWORD", () -> "DemoPass1234!");
        registry.add("DEMO_CITIZEN_TWO_PASSWORD", () -> "DemoPass1234!");
        registry.add("DEMO_AUTHORITY_PASSWORD", () -> "DemoPass1234!");
    }

    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtEncoder encoder;
    @Autowired DisasterService disasterService;
    @Autowired ReportService reportService;
    @Autowired ReportModerationService reportModerationService;
    @Autowired DemoRescueTeamBootstrap demoBootstrap;
    @MockitoSpyBean MissionRepository missionRepository;

    @BeforeEach
    void resetData() {
        reset(missionRepository);
        jdbc.update("DELETE FROM rescue_missions");
        jdbc.update("DELETE FROM reporting_reports");
        jdbc.update("DELETE FROM disasters");
        // Ensure demo teams exist
        demoBootstrap.run(new DefaultApplicationArguments());
    }

    @Test
    void flywayMigrationV6AppliedSuccessfully() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '6' AND success", Integer.class))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM rescue_teams", Integer.class)).isGreaterThanOrEqualTo(2);
    }

    @Test
    void demoBootstrapIsIdempotentAndHasNoPublicSeedEndpoint() {
        int initialCount = jdbc.queryForObject("SELECT count(*) FROM rescue_teams", Integer.class);
        demoBootstrap.run(new DefaultApplicationArguments());
        int afterRerun = jdbc.queryForObject("SELECT count(*) FROM rescue_teams", Integer.class);
        assertThat(afterRerun).isEqualTo(initialCount);

        // Verify no seed endpoint exists
        assertError(call(HttpMethod.POST, "/api/rescue-teams/seed", null, token(AUTHORITY_USER, "AUTHORITY")), 403, "FORBIDDEN");
        assertError(call(HttpMethod.POST, "/api/rescue-teams", "{}", token(AUTHORITY_USER, "AUTHORITY")), 403, "FORBIDDEN");
    }

    @Test
    void writeMethodsEnforceAuthorityAndValidateTokens() {
        UUID reportId = UUID.randomUUID();
        UUID teamId = getDemoTeamId(1);
        String body = "{\"reportId\":\"" + reportId + "\",\"teamId\":\"" + teamId + "\"}";

        // Unauthenticated -> 401
        assertError(call(HttpMethod.POST, "/api/rescue-missions", body, null), 401, "UNAUTHENTICATED");
        assertError(call(HttpMethod.GET, "/api/rescue-teams", null, null), 401, "UNAUTHENTICATED");
        assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + UUID.randomUUID() + "/status", "{\"status\":\"IN_PROGRESS\"}", null), 401, "UNAUTHENTICATED");

        // Citizen -> 403
        String citizenToken = token(CITIZEN_ONE, "CITIZEN");
        assertError(call(HttpMethod.POST, "/api/rescue-missions", body, citizenToken), 403, "FORBIDDEN");
        assertError(call(HttpMethod.GET, "/api/rescue-teams", null, citizenToken), 403, "FORBIDDEN");
        assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + UUID.randomUUID() + "/status", "{\"status\":\"IN_PROGRESS\"}", citizenToken), 403, "FORBIDDEN");

        // Unsupported roles -> 403
        for (String role : List.of("RESPONDER", "ADMIN")) {
            String roleToken = token(UUID.randomUUID(), role);
            assertError(call(HttpMethod.POST, "/api/rescue-missions", body, roleToken), 403, "FORBIDDEN");
            assertError(call(HttpMethod.GET, "/api/rescue-teams", null, roleToken), 403, "FORBIDDEN");
            assertError(call(HttpMethod.GET, "/api/rescue-missions", null, roleToken), 403, "FORBIDDEN");
            assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + UUID.randomUUID() + "/status", "{\"status\":\"IN_PROGRESS\"}", roleToken), 403, "FORBIDDEN");
        }
    }

    @Test
    void listRescueTeamsSupportsPagingSortingAndAvailabilityFilter() {
        String auth = token(AUTHORITY_USER, "AUTHORITY");

        var response = call(HttpMethod.GET, "/api/rescue-teams?page=0&size=20&sort=name,asc", null, auth);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");

        JsonNode body = response.getBody();
        assertThat(body.path("totalElements").asInt()).isGreaterThanOrEqualTo(2);
        assertThat(body.path("items").isArray()).isTrue();
        assertThat(body.path("items").get(0).path("availability").asText()).isEqualTo("AVAILABLE");

        // Sort desc
        var descResp = call(HttpMethod.GET, "/api/rescue-teams?sort=name,desc", null, auth);
        assertThat(descResp.getStatusCode().value()).isEqualTo(200);

        // Filter available
        var availResp = call(HttpMethod.GET, "/api/rescue-teams?availability=AVAILABLE", null, auth);
        assertThat(availResp.getStatusCode().value()).isEqualTo(200);

        // Filter busy when no missions exist -> empty
        var busyResp = call(HttpMethod.GET, "/api/rescue-teams?availability=BUSY", null, auth);
        assertThat(busyResp.getStatusCode().value()).isEqualTo(200);
        assertThat(busyResp.getBody().path("totalElements").asInt()).isZero();
        assertThat(busyResp.getBody().path("items")).isEmpty();

        // Invalid query
        assertError(call(HttpMethod.GET, "/api/rescue-teams?page=-1", null, auth), 400, "VALIDATION_ERROR");
        assertError(call(HttpMethod.GET, "/api/rescue-teams?size=0", null, auth), 400, "VALIDATION_ERROR");
        assertError(call(HttpMethod.GET, "/api/rescue-teams?sort=id,asc", null, auth), 400, "VALIDATION_ERROR");
        assertError(call(HttpMethod.GET, "/api/rescue-teams?availability=INVALID", null, auth), 400, "VALIDATION_ERROR");
        assertError(call(HttpMethod.GET, "/api/rescue-teams?unknown=1", null, auth), 400, "VALIDATION_ERROR");

        // Body on GET -> 400
        assertError(call(HttpMethod.GET, "/api/rescue-teams", "{}", auth), 400, "VALIDATION_ERROR");
    }

    @Test
    void createMissionValidatesReportStateDisasterStateAndTeamAvailability() {
        String auth = token(AUTHORITY_USER, "AUTHORITY");
        UUID teamId = getDemoTeamId(1);

        // Non-existent report -> 404
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(UUID.randomUUID(), teamId), auth), 404, "NOT_FOUND");

        // PENDING report -> 409 REPORT_NOT_VERIFIED
        UUID pendingReportId = createReport(CITIZEN_ONE);
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(pendingReportId, teamId), auth), 409, "REPORT_NOT_VERIFIED");

        // REJECTED report -> 409 REPORT_NOT_VERIFIED
        UUID rejectedReportId = createReport(CITIZEN_ONE);
        reportModerationService.decide(new ReportActor(AUTHORITY_USER, ReportActor.Role.AUTHORITY), rejectedReportId,
                new ReportModerationService.Decision(ReportStatus.REJECTED, null, "Not valid"));
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(rejectedReportId, teamId), auth), 409, "REPORT_NOT_VERIFIED");

        // VERIFIED report with RESOLVED disaster -> 409 DISASTER_NOT_ACTIVE
        UUID resolvedDisasterId = createDisaster();
        disasterService.update(new DisasterService.Update(resolvedDisasterId, 0,
                new Disaster.Change(Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.of(com.gdrn.disaster.domain.DisasterStatus.RESOLVED))));
        UUID reportWithResolvedDisaster = createReport(CITIZEN_ONE);
        // Force database to simulate verified report that was linked before resolve
        jdbc.update("UPDATE reporting_reports SET status='VERIFIED', disaster_id=?, verified_at=NOW(), updated_at=NOW() WHERE id=?",
                resolvedDisasterId, reportWithResolvedDisaster);
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(reportWithResolvedDisaster, teamId), auth), 409, "DISASTER_NOT_ACTIVE");

        // Non-existent team -> 404
        UUID activeDisasterId = createDisaster();
        UUID validReportId = createAndVerifyReport(CITIZEN_ONE, activeDisasterId);
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(validReportId, UUID.randomUUID()), auth), 404, "NOT_FOUND");

        // Successful assignment
        var success = call(HttpMethod.POST, "/api/rescue-missions", missionJson(validReportId, teamId), auth);
        assertThat(success.getStatusCode().value()).isEqualTo(201);
        assertThat(success.getHeaders().getCacheControl()).isEqualTo("no-store");
        JsonNode mission = success.getBody();
        assertThat(mission.path("reportId").asText()).isEqualTo(validReportId.toString());
        assertThat(mission.path("teamId").asText()).isEqualTo(teamId.toString());
        assertThat(mission.path("status").asText()).isEqualTo("ASSIGNED");
        assertThat(mission.hasNonNull("assignedAt")).isTrue();
        assertThat(mission.hasNonNull("updatedAt")).isTrue();
        assertThat(mission.has("startedAt")).isFalse();
        assertThat(mission.has("completedAt")).isFalse();

        // Report already assigned -> 409 REPORT_ALREADY_ASSIGNED
        UUID team2Id = getDemoTeamId(2);
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(validReportId, team2Id), auth), 409, "REPORT_ALREADY_ASSIGNED");

        // Team busy -> 409 TEAM_BUSY
        UUID anotherReportId = createAndVerifyReport(CITIZEN_TWO, activeDisasterId);
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(anotherReportId, teamId), auth), 409, "TEAM_BUSY");

        // Verify team availability reflects BUSY
        var teamList = call(HttpMethod.GET, "/api/rescue-teams?availability=BUSY", null, auth);
        assertThat(teamList.getBody().path("items").toString()).contains(teamId.toString());
    }

    @Test
    void missionLifecycleAssignedToInProgressThenCompletedAndAllowsCompletionEvenIfDisasterResolved() {
        String auth = token(AUTHORITY_USER, "AUTHORITY");
        UUID disasterId = createDisaster();
        UUID reportId = createAndVerifyReport(CITIZEN_ONE, disasterId);
        UUID teamId = getDemoTeamId(1);

        var created = call(HttpMethod.POST, "/api/rescue-missions", missionJson(reportId, teamId), auth);
        assertThat(created.getStatusCode().value()).isEqualTo(201);
        String missionId = created.getBody().path("id").asText();

        // Invalid transitions
        assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"COMPLETED\"}", auth), 409, "INVALID_TRANSITION");
        assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"ASSIGNED\"}", auth), 409, "INVALID_TRANSITION");

        // Resolve disaster after mission was created
        disasterService.update(new DisasterService.Update(disasterId, 0,
                new Disaster.Change(Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty(), Optional.of(com.gdrn.disaster.domain.DisasterStatus.RESOLVED))));

        // Mission can still transition to IN_PROGRESS!
        var toInProgress = call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"IN_PROGRESS\"}", auth);
        assertThat(toInProgress.getStatusCode().value()).isEqualTo(200);
        JsonNode inProg = toInProgress.getBody();
        assertThat(inProg.path("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(inProg.hasNonNull("startedAt")).isTrue();
        assertThat(inProg.has("completedAt")).isFalse();

        // Repeating IN_PROGRESS -> 409
        assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"IN_PROGRESS\"}", auth), 409, "INVALID_TRANSITION");

        // Mission transitions to COMPLETED
        var toCompleted = call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"COMPLETED\"}", auth);
        assertThat(toCompleted.getStatusCode().value()).isEqualTo(200);
        JsonNode comp = toCompleted.getBody();
        assertThat(comp.path("status").asText()).isEqualTo("COMPLETED");
        assertThat(comp.hasNonNull("startedAt")).isTrue();
        assertThat(comp.hasNonNull("completedAt")).isTrue();

        // Post-completion transitions forbidden
        assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"IN_PROGRESS\"}", auth), 409, "INVALID_TRANSITION");
        assertError(call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"COMPLETED\"}", auth), 409, "INVALID_TRANSITION");
    }

    @Test
    void teamCanBeReusedAfterCompletedButReportCannotBeReassigned() {
        String auth = token(AUTHORITY_USER, "AUTHORITY");
        UUID disasterId = createDisaster();
        UUID report1 = createAndVerifyReport(CITIZEN_ONE, disasterId);
        UUID teamId = getDemoTeamId(1);

        // Assign mission 1 and complete it
        var m1 = call(HttpMethod.POST, "/api/rescue-missions", missionJson(report1, teamId), auth);
        String m1Id = m1.getBody().path("id").asText();
        call(HttpMethod.PATCH, "/api/rescue-missions/" + m1Id + "/status", "{\"status\":\"IN_PROGRESS\"}", auth);
        call(HttpMethod.PATCH, "/api/rescue-missions/" + m1Id + "/status", "{\"status\":\"COMPLETED\"}", auth);

        // Team availability is now AVAILABLE again
        var teamList = call(HttpMethod.GET, "/api/rescue-teams?availability=AVAILABLE", null, auth);
        assertThat(teamList.getBody().path("items").toString()).contains(teamId.toString());

        // Team can be assigned a new report
        UUID report2 = createAndVerifyReport(CITIZEN_TWO, disasterId);
        var m2 = call(HttpMethod.POST, "/api/rescue-missions", missionJson(report2, teamId), auth);
        assertThat(m2.getStatusCode().value()).isEqualTo(201);

        // Old report1 CANNOT be assigned another team even though its mission is COMPLETED
        UUID team2Id = getDemoTeamId(2);
        assertError(call(HttpMethod.POST, "/api/rescue-missions", missionJson(report1, team2Id), auth), 409, "REPORT_ALREADY_ASSIGNED");

        // Verify DB invariants
        assertThat(jdbc.queryForObject("SELECT count(*) FROM rescue_missions WHERE report_id = ?", Integer.class, report1)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM rescue_missions WHERE report_id = ?", Integer.class, report2)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM rescue_missions WHERE team_id = ? AND status IN ('ASSIGNED', 'IN_PROGRESS')", Integer.class, teamId)).isEqualTo(1);
    }

    @Test
    void listMissionsEnforcesCitizenIsolationAndSupportsAuthorityFilters() {
        String citizenOneToken = token(CITIZEN_ONE, "CITIZEN");
        String citizenTwoToken = token(CITIZEN_TWO, "CITIZEN");
        String authorityToken = token(AUTHORITY_USER, "AUTHORITY");

        UUID disasterId = createDisaster();
        UUID report1 = createAndVerifyReport(CITIZEN_ONE, disasterId);
        UUID report2 = createAndVerifyReport(CITIZEN_TWO, disasterId);
        UUID teamId = getDemoTeamId(1);

        call(HttpMethod.POST, "/api/rescue-missions", missionJson(report1, teamId), authorityToken);

        // Citizen 1 requires reportId: missing -> 400
        assertError(call(HttpMethod.GET, "/api/rescue-missions", null, citizenOneToken), 400, "VALIDATION_ERROR");

        // Citizen 1 querying missing reportId -> 404
        assertError(call(HttpMethod.GET, "/api/rescue-missions?reportId=" + UUID.randomUUID(), null, citizenOneToken), 404, "NOT_FOUND");

        // Citizen 1 querying Citizen 2's reportId -> 404 (isolation!)
        assertError(call(HttpMethod.GET, "/api/rescue-missions?reportId=" + report2, null, citizenOneToken), 404, "NOT_FOUND");

        // Citizen 1 querying own reportId with assigned mission -> 200 with mission
        var ownMission = call(HttpMethod.GET, "/api/rescue-missions?reportId=" + report1, null, citizenOneToken);
        assertThat(ownMission.getStatusCode().value()).isEqualTo(200);
        assertThat(ownMission.getBody().path("totalElements").asInt()).isEqualTo(1);
        assertThat(ownMission.getBody().path("items").get(0).path("reportId").asText()).isEqualTo(report1.toString());

        // Citizen 2 querying own report2 without mission -> 200 with empty items []
        var emptyMission = call(HttpMethod.GET, "/api/rescue-missions?reportId=" + report2, null, citizenTwoToken);
        assertThat(emptyMission.getStatusCode().value()).isEqualTo(200);
        assertThat(emptyMission.getBody().path("totalElements").asInt()).isZero();
        assertThat(emptyMission.getBody().path("items")).isEmpty();

        // Authority without reportId -> lists all missions
        var allMissions = call(HttpMethod.GET, "/api/rescue-missions", null, authorityToken);
        assertThat(allMissions.getStatusCode().value()).isEqualTo(200);
        assertThat(allMissions.getBody().path("totalElements").asInt()).isEqualTo(1);

        // Authority with non-existent teamId -> empty list
        var nonExistentTeam = call(HttpMethod.GET, "/api/rescue-missions?teamId=" + UUID.randomUUID(), null, authorityToken);
        assertThat(nonExistentTeam.getStatusCode().value()).isEqualTo(200);
        assertThat(nonExistentTeam.getBody().path("totalElements").asInt()).isZero();

        // Authority with non-existent reportId -> 404
        assertError(call(HttpMethod.GET, "/api/rescue-missions?reportId=" + UUID.randomUUID(), null, authorityToken), 404, "NOT_FOUND");
    }

    @Test
    void raceTwoMissionsForSameTeamHasOneSuccessAndOneTeamBusy() throws Exception {
        UUID disasterId = createDisaster();
        UUID report1 = createAndVerifyReport(CITIZEN_ONE, disasterId);
        UUID report2 = createAndVerifyReport(CITIZEN_TWO, disasterId);
        UUID teamId = getDemoTeamId(1);
        String auth = token(AUTHORITY_USER, "AUTHORITY");

        var barrier = new CyclicBarrier(2);
        doAnswer(invocation -> {
            boolean active = (boolean) invocation.callRealMethod();
            barrier.await(10, TimeUnit.SECONDS);
            return active;
        }).when(missionRepository).hasActiveMissionForTeam(teamId);

        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> call(HttpMethod.POST, "/api/rescue-missions", missionJson(report1, teamId), auth));
            var second = pool.submit(() -> call(HttpMethod.POST, "/api/rescue-missions", missionJson(report2, teamId), auth));

            var r1 = first.get(15, TimeUnit.SECONDS);
            var r2 = second.get(15, TimeUnit.SECONDS);
            var responses = List.of(r1, r2);

            assertThat(responses.stream().filter(r -> r.getStatusCode().value() == 201).count()).isEqualTo(1);
            var loser = responses.stream().filter(r -> r.getStatusCode().value() == 409).findFirst().orElseThrow();
            assertError(loser, 409, "TEAM_BUSY");
        } finally {
            reset(missionRepository);
        }

        // Verify database integrity
        assertThat(jdbc.queryForObject("SELECT count(*) FROM rescue_missions WHERE team_id = ? AND status IN ('ASSIGNED', 'IN_PROGRESS')", Integer.class, teamId))
                .isEqualTo(1);
    }

    @Test
    void raceTwoMissionsForSameReportHasOneSuccessAndOneReportAlreadyAssigned() throws Exception {
        UUID disasterId = createDisaster();
        UUID reportId = createAndVerifyReport(CITIZEN_ONE, disasterId);
        UUID team1Id = getDemoTeamId(1);
        UUID team2Id = getDemoTeamId(2);
        String auth = token(AUTHORITY_USER, "AUTHORITY");

        var barrier = new CyclicBarrier(2);
        doAnswer(invocation -> {
            boolean exists = (boolean) invocation.callRealMethod();
            barrier.await(10, TimeUnit.SECONDS);
            return exists;
        }).when(missionRepository).existsByReportId(reportId);

        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> call(HttpMethod.POST, "/api/rescue-missions", missionJson(reportId, team1Id), auth));
            var second = pool.submit(() -> call(HttpMethod.POST, "/api/rescue-missions", missionJson(reportId, team2Id), auth));

            var r1 = first.get(15, TimeUnit.SECONDS);
            var r2 = second.get(15, TimeUnit.SECONDS);
            var responses = List.of(r1, r2);

            assertThat(responses.stream().filter(r -> r.getStatusCode().value() == 201).count()).isEqualTo(1);
            var loser = responses.stream().filter(r -> r.getStatusCode().value() == 409).findFirst().orElseThrow();
            assertError(loser, 409, "REPORT_ALREADY_ASSIGNED");
        } finally {
            reset(missionRepository);
        }

        // Verify database integrity
        assertThat(jdbc.queryForObject("SELECT count(*) FROM rescue_missions WHERE report_id = ?", Integer.class, reportId))
                .isEqualTo(1);
    }

    @Test
    void raceConcurrentStatusUpdatesHasOneSuccessAndOneConflict() throws Exception {
        UUID disasterId = createDisaster();
        UUID reportId = createAndVerifyReport(CITIZEN_ONE, disasterId);
        UUID teamId = getDemoTeamId(1);
        String auth = token(AUTHORITY_USER, "AUTHORITY");

        var created = call(HttpMethod.POST, "/api/rescue-missions", missionJson(reportId, teamId), auth);
        String missionId = created.getBody().path("id").asText();
        UUID mId = UUID.fromString(missionId);

        var barrier = new CyclicBarrier(2);
        var calls = new AtomicInteger(0);
        doAnswer(invocation -> {
            Optional<?> opt = (Optional<?>) invocation.callRealMethod();
            if (calls.incrementAndGet() <= 2) {
                barrier.await(10, TimeUnit.SECONDS);
            }
            return opt;
        }).when(missionRepository).findById(mId);

        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"IN_PROGRESS\"}", auth));
            var second = pool.submit(() -> call(HttpMethod.PATCH, "/api/rescue-missions/" + missionId + "/status", "{\"status\":\"IN_PROGRESS\"}", auth));

            var r1 = first.get(15, TimeUnit.SECONDS);
            var r2 = second.get(15, TimeUnit.SECONDS);
            var responses = List.of(r1, r2);

            assertThat(responses.stream().filter(r -> r.getStatusCode().value() == 200).count()).isEqualTo(1);
            var loser = responses.stream().filter(r -> r.getStatusCode().value() == 409).findFirst().orElseThrow();
            assertError(loser, 409, "INVALID_TRANSITION");
        } finally {
            reset(missionRepository);
        }

        assertThat(jdbc.queryForObject("SELECT status FROM rescue_missions WHERE id = ?", String.class, mId))
                .isEqualTo("IN_PROGRESS");
    }

    @Test
    void rejectsInvalidBodyShapesAndUnknownFieldsWithValidationErrors() {
        String auth = token(AUTHORITY_USER, "AUTHORITY");
        UUID validReport = createAndVerifyReport(CITIZEN_ONE, createDisaster());
        UUID validTeam = getDemoTeamId(1);

        for (String badBody : List.of("{}", "null", "[]", "{",
                "{\"reportId\":null,\"teamId\":\"" + validTeam + "\"}",
                "{\"reportId\":\"" + validReport + "\",\"teamId\":null}",
                "{\"reportId\":\"1-1-1-1\",\"teamId\":\"" + validTeam + "\"}",
                "{\"reportId\":\"" + validReport + "\",\"teamId\":\"" + validTeam + "\",\"extra\":\"x\"}")) {
            assertError(call(HttpMethod.POST, "/api/rescue-missions", badBody, auth), 400, "VALIDATION_ERROR");
        }

        // Content-Type not JSON -> 415
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(auth);
        headers.setContentType(MediaType.TEXT_PLAIN);
        var resp = http.exchange("/api/rescue-missions", HttpMethod.POST, new HttpEntity<>(missionJson(validReport, validTeam), headers), JsonNode.class);
        assertError(resp, 415, "UNSUPPORTED_MEDIA_TYPE");

        // Query param on POST -> 400
        assertError(call(HttpMethod.POST, "/api/rescue-missions?extra=1", missionJson(validReport, validTeam), auth), 400, "VALIDATION_ERROR");
    }

    private UUID getDemoTeamId(int index) {
        String name = "Demo team " + index;
        return jdbc.queryForObject("SELECT id FROM rescue_teams WHERE name = ?", UUID.class, name);
    }

    private UUID createDisaster() {
        var created = disasterService.create(new DisasterService.Create("Test Disaster", DisasterType.FLOOD, Severity.HIGH, "Description", 21.028, 105.834));
        return created.id();
    }

    private UUID createReport(UUID citizenId) {
        Report report = reportService.submit(new ReportActor(citizenId, ReportActor.Role.CITIZEN),
                ReportType.FLOOD, "Report detail", new Coordinates(21.028, 105.834));
        return report.id();
    }

    private UUID createAndVerifyReport(UUID citizenId, UUID disasterId) {
        UUID reportId = createReport(citizenId);
        reportModerationService.decide(new ReportActor(AUTHORITY_USER, ReportActor.Role.AUTHORITY), reportId,
                new ReportModerationService.Decision(ReportStatus.VERIFIED, disasterId, null));
        return reportId;
    }

    private String missionJson(UUID reportId, UUID teamId) {
        return "{\"reportId\":\"" + reportId + "\",\"teamId\":\"" + teamId + "\"}";
    }

    private String token(UUID userId, String role) {
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer("gdrn")
                .audience(List.of("gdrn-spa"))
                .subject(userId.toString())
                .claim("role", role)
                .issuedAt(now)
                .notBefore(now)
                .expiresAt(now.plusSeconds(900))
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    private ResponseEntity<JsonNode> call(HttpMethod method, String path, String body, String token) {
        var headers = new HttpHeaders();
        if (body != null) headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) headers.setBearerAuth(token);
        return http.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private void assertError(ResponseEntity<JsonNode> response, int status, String code) {
        assertThat(response.getStatusCode().value()).isEqualTo(status);
        assertThat(response.getBody().path("status").asInt()).isEqualTo(status);
        assertThat(response.getBody().path("code").asText()).isEqualTo(code);
        assertThat(response.getBody().has("fieldErrors")).isTrue();
        assertThat(response.getBody().toString()).doesNotContain("stackTrace", "password", "passwordHash");
    }
}
