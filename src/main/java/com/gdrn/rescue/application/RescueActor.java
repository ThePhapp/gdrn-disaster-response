package com.gdrn.rescue.application;

import java.util.Objects;
import java.util.UUID;

public record RescueActor(UUID id, Role role) {
    public enum Role { CITIZEN, AUTHORITY }

    public RescueActor {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(role, "role");
    }

    public void requireCitizen() {
        if (role != Role.CITIZEN) throw new RescueAccessDenied();
    }

    public void requireAuthority() {
        if (role != Role.AUTHORITY) throw new RescueAccessDenied();
    }
}
