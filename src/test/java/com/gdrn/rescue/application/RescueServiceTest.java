package com.gdrn.rescue.application;

import com.gdrn.rescue.application.port.MissionRepository;
import com.gdrn.rescue.application.port.ReportLookupPort;
import com.gdrn.rescue.application.port.ReportSummary;
import com.gdrn.rescue.application.port.RescueTeamRepository;
import com.gdrn.rescue.domain.InvalidMissionTransition;
import com.gdrn.rescue.domain.InvalidRescueInput;
import com.gdrn.rescue.domain.Mission;
import com.gdrn.rescue.domain.MissionStatus;
import com.gdrn.rescue.domain.RescueTeam;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RescueServiceTest {

    private RescueTeamRepository teams;
    private MissionRepository missions;
    private ReportLookupPort reportLookup;
    private RescueService service;
    private final Instant now = Instant.parse("2026-10-10T12:00:00Z");
    private final Clock clock = Clock.fixed(now, ZoneOffset.UTC);

    private final RescueActor authority = new RescueActor(UUID.randomUUID(), RescueActor.Role.AUTHORITY);
    private final RescueActor citizen = new RescueActor(UUID.randomUUID(), RescueActor.Role.CITIZEN);

    @BeforeEach
    void setUp() {
        teams = mock(RescueTeamRepository.class);
        missions = mock(MissionRepository.class);
        reportLookup = mock(ReportLookupPort.class);
        service = new RescueService(teams, missions, reportLookup, clock);
    }

    @Test
    void listTeamsRequiresAuthorityAndValidPaging() {
        assertThatThrownBy(() -> service.listTeams(citizen, 0, 20, "name,asc", null))
                .isInstanceOf(RescueAccessDenied.class);

        assertThatThrownBy(() -> service.listTeams(authority, -1, 20, "name,asc", null))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("page");

        assertThatThrownBy(() -> service.listTeams(authority, 0, 0, "name,asc", null))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("size");

        assertThatThrownBy(() -> service.listTeams(authority, 0, 101, "name,asc", null))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("size");

        assertThatThrownBy(() -> service.listTeams(authority, 0, 20, "invalid,asc", null))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("sort");

        assertThatThrownBy(() -> service.listTeams(authority, 0, 20, "name,asc", "UNKNOWN"))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("availability");

        when(teams.findTeams(0, 20, "name,asc", "AVAILABLE"))
                .thenReturn(new RescueTeamPageResult(List.of(), 0, 20, 0, 0));

        var result = service.listTeams(authority, 0, 20, "name,asc", "AVAILABLE");
        assertThat(result.totalElements()).isZero();
        verify(teams).findTeams(0, 20, "name,asc", "AVAILABLE");
    }

    @Test
    void createMissionRequiresAuthorityAndValidInputs() {
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();

        assertThatThrownBy(() -> service.createMission(citizen, reportId, teamId))
                .isInstanceOf(RescueAccessDenied.class);

        assertThatThrownBy(() -> service.createMission(authority, null, teamId))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("reportId");

        assertThatThrownBy(() -> service.createMission(authority, reportId, null))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("teamId");
    }

    @Test
    void createMissionValidatesReportStateAndDisasterState() {
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();

        // Report missing
        when(reportLookup.findById(reportId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createMission(authority, reportId, teamId))
                .isInstanceOf(RescueNotFoundException.class);

        // Report not verified
        when(reportLookup.findById(reportId))
                .thenReturn(Optional.of(new ReportSummary(reportId, UUID.randomUUID(), false, true)));
        assertThatThrownBy(() -> service.createMission(authority, reportId, teamId))
                .isInstanceOf(ReportNotVerified.class);

        // Disaster not active
        when(reportLookup.findById(reportId))
                .thenReturn(Optional.of(new ReportSummary(reportId, UUID.randomUUID(), true, false)));
        assertThatThrownBy(() -> service.createMission(authority, reportId, teamId))
                .isInstanceOf(DisasterNotActive.class);
    }

    @Test
    void createMissionValidatesTeamExistenceAndUniqueness() {
        UUID reportId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();

        when(reportLookup.findById(reportId))
                .thenReturn(Optional.of(new ReportSummary(reportId, UUID.randomUUID(), true, true)));

        // Team missing
        when(teams.findById(teamId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createMission(authority, reportId, teamId))
                .isInstanceOf(RescueNotFoundException.class);

        // Team exists
        when(teams.findById(teamId)).thenReturn(Optional.of(new RescueTeam(teamId, "Team 1")));

        // Report already assigned
        when(missions.existsByReportId(reportId)).thenReturn(true);
        assertThatThrownBy(() -> service.createMission(authority, reportId, teamId))
                .isInstanceOf(ReportAlreadyAssigned.class);

        // Team already has active mission
        when(missions.existsByReportId(reportId)).thenReturn(false);
        when(missions.hasActiveMissionForTeam(teamId)).thenReturn(true);
        assertThatThrownBy(() -> service.createMission(authority, reportId, teamId))
                .isInstanceOf(TeamBusy.class);

        // Success
        when(missions.hasActiveMissionForTeam(teamId)).thenReturn(false);
        when(missions.insert(any(Mission.class))).thenAnswer(i -> i.getArgument(0));

        Mission created = service.createMission(authority, reportId, teamId);
        assertThat(created.reportId()).isEqualTo(reportId);
        assertThat(created.teamId()).isEqualTo(teamId);
        assertThat(created.status()).isEqualTo(MissionStatus.ASSIGNED);
        assertThat(created.assignedAt()).isEqualTo(now.truncatedTo(ChronoUnit.MICROS));
    }

    @Test
    void listMissionsEnforcesCitizenReportIdOwnership() {
        UUID reportId = UUID.randomUUID();

        // Citizen without reportId -> 400
        assertThatThrownBy(() -> service.listMissions(citizen, Optional.empty(), Optional.empty(), Optional.empty(), 0, 20, "createdAt,desc"))
                .isInstanceOf(InvalidRescueInput.class)
                .hasMessageContaining("reportId");

        // Citizen with non-existent reportId -> 404
        when(reportLookup.findById(reportId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.listMissions(citizen, Optional.of(reportId), Optional.empty(), Optional.empty(), 0, 20, "createdAt,desc"))
                .isInstanceOf(RescueNotFoundException.class);

        // Citizen with other citizen's reportId -> 404
        when(reportLookup.findById(reportId))
                .thenReturn(Optional.of(new ReportSummary(reportId, UUID.randomUUID(), true, true)));
        assertThatThrownBy(() -> service.listMissions(citizen, Optional.of(reportId), Optional.empty(), Optional.empty(), 0, 20, "createdAt,desc"))
                .isInstanceOf(RescueNotFoundException.class);

        // Citizen with own reportId -> Success
        when(reportLookup.findById(reportId))
                .thenReturn(Optional.of(new ReportSummary(reportId, citizen.id(), true, true)));
        when(missions.findMissions(Optional.of(reportId), Optional.empty(), Optional.empty(), 0, 20, "createdAt,desc"))
                .thenReturn(new MissionPageResult(List.of(), 0, 20, 0, 0));

        var result = service.listMissions(citizen, Optional.of(reportId), Optional.empty(), Optional.empty(), 0, 20, "createdAt,desc");
        assertThat(result.totalElements()).isZero();
    }

    @Test
    void updateMissionStatusValidatesRoleAndStateTransition() {
        UUID missionId = UUID.randomUUID();
        Mission assigned = Mission.assign(missionId, UUID.randomUUID(), UUID.randomUUID(), now.minusSeconds(60));

        assertThatThrownBy(() -> service.updateMissionStatus(citizen, missionId, MissionStatus.IN_PROGRESS))
                .isInstanceOf(RescueAccessDenied.class);

        // Non-existent mission
        when(missions.findById(missionId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateMissionStatus(authority, missionId, MissionStatus.IN_PROGRESS))
                .isInstanceOf(RescueNotFoundException.class);

        // Existing mission
        when(missions.findById(missionId)).thenReturn(Optional.of(assigned));
        when(missions.updateMission(any(), eq(MissionStatus.ASSIGNED))).thenReturn(true);

        Mission updated = service.updateMissionStatus(authority, missionId, MissionStatus.IN_PROGRESS);
        assertThat(updated.status()).isEqualTo(MissionStatus.IN_PROGRESS);
        assertThat(updated.startedAt()).isEqualTo(now.truncatedTo(ChronoUnit.MICROS));

        // Invalid transition: ASSIGNED -> COMPLETED
        assertThatThrownBy(() -> service.updateMissionStatus(authority, missionId, MissionStatus.COMPLETED))
                .isInstanceOf(InvalidMissionTransition.class);
    }
}
