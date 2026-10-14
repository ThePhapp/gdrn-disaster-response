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

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public final class RescueService {
    private final RescueTeamRepository teams;
    private final MissionRepository missions;
    private final ReportLookupPort reportLookup;
    private final Clock clock;

    public RescueService(RescueTeamRepository teams, MissionRepository missions, ReportLookupPort reportLookup, Clock clock) {
        this.teams = Objects.requireNonNull(teams, "teams");
        this.missions = Objects.requireNonNull(missions, "missions");
        this.reportLookup = Objects.requireNonNull(reportLookup, "reportLookup");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    public RescueService(RescueTeamRepository teams, MissionRepository missions, ReportLookupPort reportLookup) {
        this(teams, missions, reportLookup, Clock.systemUTC());
    }

    public RescueTeamPageResult listTeams(RescueActor actor, int page, int size, String sort, String availability) {
        actor.requireAuthority();

        if (page < 0 || page > 1000000) throw new InvalidRescueInput("page");
        if (size < 1 || size > 100) throw new InvalidRescueInput("size");

        if (sort != null && !sort.isBlank() && !"name,asc".equals(sort) && !"name,desc".equals(sort)) {
            throw new InvalidRescueInput("sort");
        }

        if (availability != null && !availability.isBlank() && !"AVAILABLE".equals(availability) && !"BUSY".equals(availability)) {
            throw new InvalidRescueInput("availability");
        }

        return teams.findTeams(page, size, sort == null ? "name,asc" : sort, availability);
    }

    public Mission createMission(RescueActor actor, UUID reportId, UUID teamId) {
        actor.requireAuthority();
        if (reportId == null) throw new InvalidRescueInput("reportId");
        if (teamId == null) throw new InvalidRescueInput("teamId");

        ReportSummary report = reportLookup.findById(reportId)
                .orElseThrow(() -> new RescueNotFoundException("Report not found"));

        if (!report.verified()) {
            throw new ReportNotVerified("Report is not verified");
        }
        if (!report.disasterActive()) {
            throw new DisasterNotActive("Associated disaster is not active");
        }

        RescueTeam team = teams.findById(teamId)
                .orElseThrow(() -> new RescueNotFoundException("Rescue team not found"));

        if (missions.existsByReportId(reportId)) {
            throw new ReportAlreadyAssigned("Report already has an assigned mission");
        }
        if (missions.hasActiveMissionForTeam(teamId)) {
            throw new TeamBusy("Team already has an active mission");
        }

        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        Mission mission = Mission.assign(UUID.randomUUID(), report.id(), team.id(), now);
        return missions.insert(mission);
    }

    public MissionPageResult listMissions(RescueActor actor, Optional<UUID> reportId, Optional<UUID> teamId,
                                          Optional<MissionStatus> status, int page, int size, String sort) {
        if (page < 0 || page > 1000000) throw new InvalidRescueInput("page");
        if (size < 1 || size > 100) throw new InvalidRescueInput("size");

        if (sort != null && !sort.isBlank() && !"createdAt,desc".equals(sort) && !"createdAt,asc".equals(sort)) {
            throw new InvalidRescueInput("sort");
        }

        if (actor.role() == RescueActor.Role.CITIZEN) {
            if (reportId.isEmpty()) {
                throw new InvalidRescueInput("reportId");
            }
        }

        if (reportId.isPresent()) {
            UUID requestedReportId = reportId.get();
            ReportSummary report = reportLookup.findById(requestedReportId)
                    .orElseThrow(() -> new RescueNotFoundException("Report not found"));
            if (actor.role() == RescueActor.Role.CITIZEN && !report.reporterId().equals(actor.id())) {
                throw new RescueNotFoundException("Report not found");
            }
        }

        return missions.findMissions(reportId, teamId, status, page, size, sort == null ? "createdAt,desc" : sort);
    }

    public Mission updateMissionStatus(RescueActor actor, UUID missionId, MissionStatus targetStatus) {
        actor.requireAuthority();
        if (missionId == null) throw new InvalidRescueInput("id");
        if (targetStatus == null) throw new InvalidRescueInput("status");

        Mission current = missions.findById(missionId)
                .orElseThrow(() -> new RescueNotFoundException("Mission not found"));

        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        Mission updated = switch (targetStatus) {
            case IN_PROGRESS -> current.start(now);
            case COMPLETED -> current.complete(now);
            case ASSIGNED -> throw new InvalidMissionTransition("Cannot transition back to ASSIGNED");
        };

        boolean success = missions.updateMission(updated, current.status());
        if (!success) {
            if (missions.findById(missionId).isEmpty()) {
                throw new RescueNotFoundException("Mission not found");
            }
            throw new InvalidMissionTransition("Concurrent update or invalid status transition");
        }

        return updated;
    }
}
