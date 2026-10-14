package com.gdrn.rescue.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gdrn.rescue.domain.Mission;
import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record MissionResponse(
        UUID id,
        UUID reportId,
        UUID teamId,
        String status,
        Instant assignedAt,
        Instant updatedAt,
        Instant startedAt,
        Instant completedAt
) {
    public static MissionResponse from(Mission mission) {
        return new MissionResponse(
                mission.id(),
                mission.reportId(),
                mission.teamId(),
                mission.status().name(),
                mission.assignedAt(),
                mission.updatedAt(),
                mission.startedAt(),
                mission.completedAt());
    }
}
