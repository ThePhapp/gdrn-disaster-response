package com.gdrn.rescue.api;

import com.gdrn.rescue.application.RescueTeamSummary;
import java.util.UUID;

public record RescueTeamResponse(UUID id, String name, String availability) {
    public static RescueTeamResponse from(RescueTeamSummary summary) {
        return new RescueTeamResponse(summary.id(), summary.name(), summary.availability().name());
    }
}
