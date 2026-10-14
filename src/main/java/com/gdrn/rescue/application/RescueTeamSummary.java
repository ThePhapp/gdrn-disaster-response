package com.gdrn.rescue.application;

import com.gdrn.rescue.domain.TeamAvailability;
import java.util.Objects;
import java.util.UUID;

public record RescueTeamSummary(UUID id, String name, TeamAvailability availability) {
    public RescueTeamSummary {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(availability, "availability");
    }
}
